export async function loadLegacyScripts(sources: string[]) {
  for (const src of sources) {
    // Avoid loading duplicates
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) continue;

    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(s);
    });
  }
}
