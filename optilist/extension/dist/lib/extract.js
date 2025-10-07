export function extractFromAmazon(documentRoot, url) {
    const title = (documentRoot.querySelector('#productTitle')?.textContent || "").trim();
    const bullets = Array.from(documentRoot.querySelectorAll('#feature-bullets li'))
        .map(li => li.textContent?.trim() || "")
        .filter(Boolean);
    const descSel = documentRoot.querySelector('#productDescription, #bookDescription_feature_div');
    const description = (descSel?.textContent || '').trim();
    // Images: best‑effort pulls from data-a-dynamic-image and gallery thumbs
    const imgs = new Set();
    const landing = documentRoot.querySelector('#landingImage, img#imgBlkFront, img[data-old-hires]');
    const dyn = landing?.getAttribute('data-a-dynamic-image');
    if (dyn) {
        try {
            Object.keys(JSON.parse(dyn)).forEach(u => imgs.add(u));
        }
        catch { }
    }
    documentRoot.querySelectorAll('#altImages img, .image.item img, #ebooksImageBlockContainer img')
        .forEach(img => {
        const u = img.getAttribute('srcset')?.split(',')?.pop()?.trim().split(' ')?.[0]
            || img.getAttribute('data-old-hires')
            || img.src;
        if (u)
            imgs.add(u.replace(/\._SX\d+_.*/, ''));
    });
    // JSON‑LD fallback
    const ld = Array.from(documentRoot.querySelectorAll('script[type="application/ld+json"]'))
        .map(s => { try {
        return JSON.parse(s.textContent || '{}');
    }
    catch {
        return null;
    } })
        .find(obj => obj && (obj.image || obj.name));
    if (ld?.image) {
        (Array.isArray(ld.image) ? ld.image : [ld.image]).forEach((u) => imgs.add(u));
    }
    return { url, title, bullets, description, images: Array.from(imgs) };
}
