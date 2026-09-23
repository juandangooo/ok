"""Fetch a product page's main image (and listed price, if any).

Run: python3 gear-study/fetch_product.py <item-id> <product-page-url> [<image-url>]
Saves gear-study/photos/<item-id>.jpg (max 700px) and prints the price found.
"""
import io
import json
import os
import re
import sys
import urllib.request

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=25).read()


def meta(html, prop):
    for pat in (rf'<meta[^>]+(?:property|name)=["\']{prop}["\'][^>]+content=["\']([^"\']+)',
                rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']{prop}["\']'):
        m = re.search(pat, html, re.I)
        if m:
            return m.group(1).replace("&amp;", "&")
    return None


def jsonld(html):
    image, price = None, None
    for block in re.findall(r'<script[^>]+ld\+json[^>]*>(.*?)</script>', html, re.S | re.I):
        try:
            data = json.loads(block.strip())
        except ValueError:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            d = stack.pop()
            if isinstance(d, list):
                stack.extend(d)
                continue
            if not isinstance(d, dict):
                continue
            stack.extend(v for v in d.values() if isinstance(v, (dict, list)))
            if d.get("@type") in ("Product", ["Product"]):
                img = d.get("image")
                if isinstance(img, list) and img:
                    img = img[0]
                if isinstance(img, dict):
                    img = img.get("url")
                image = image or img
            if "price" in d and price is None:
                try:
                    price = float(str(d["price"]).replace(",", ""))
                except ValueError:
                    pass
    return image, price


def largest_img(html, page_url):
    """Fallback: download the page's <img> candidates and keep the biggest."""
    from urllib.parse import urljoin
    srcs = re.findall(r'<img[^>]+(?:data-src|data-zoom-image|src)=["\']([^"\']+\.(?:jpe?g|png|webp)[^"\']*)', html, re.I)
    best, best_area = None, 0
    for src in dict.fromkeys(srcs):
        if re.search(r"logo|icon|sprite|badge|flag|payment|banner", src, re.I):
            continue
        full = urljoin(page_url, src)
        try:
            w, h = Image.open(io.BytesIO(get(full))).size
        except Exception:
            continue
        if w * h > best_area:
            best, best_area = full, w * h
        if best_area > 600 * 600:
            break
    return best


def main(item_id, url, image_url=None):
    price = None
    if not image_url:
        html = get(url).decode("utf8", "ignore")
        ld_image, price = jsonld(html)
        image_url = ld_image or meta(html, "og:image") or meta(html, "twitter:image")
        if price is None:
            p = meta(html, "product:price:amount") or meta(html, "og:price:amount")
            price = float(p) if p else None
        if not image_url:
            image_url = largest_img(html, url)
    if not image_url:
        sys.exit(f"{item_id}: no image found on {url}")
    if image_url.startswith("//"):
        image_url = "https:" + image_url
    # Home Depot serves 100px thumbnails; ask for the 1000px version.
    if "thdstatic.com" in image_url:
        image_url = re.sub(r"_\d+\.(jpe?g|png)", r"_1000.\1", image_url)
    # Magento stores (e.g. Farralane) link a resized cache copy; use the original.
    image_url = re.sub(r"/cache/[0-9a-f]{32}/", "/", image_url)
    # Guitar Center / Musician's Friend serve thumbnails; ask for the large size.
    if "media.guitarcenter.com" in image_url or "media.musiciansfriend.com" in image_url:
        image_url = re.sub(r"-\d+x\d+(\.\w+)", r"-1500x1500\1", image_url)
    img = Image.open(io.BytesIO(get(image_url))).convert("RGBA")
    bg = Image.new("RGBA", img.size, "white")
    bg.alpha_composite(img)
    img = bg.convert("RGB")
    w, h = img.size
    img.thumbnail((700, 700))
    img.save(os.path.join(HERE, "photos", f"{item_id}.jpg"), quality=85, optimize=True)
    old = os.path.join(HERE, "photos", f"{item_id}.png")
    if os.path.exists(old):
        os.remove(old)
    print(f"{item_id}: {w}x{h} image saved; price on page: {price}; {image_url[:100]}")


if __name__ == "__main__":
    main(*sys.argv[1:])
