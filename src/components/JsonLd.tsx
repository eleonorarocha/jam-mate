import { useEffect } from 'react';

interface JsonLdProps {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Injects a JSON-LD structured data script into <head>.
 * Removes itself on unmount so per-route schema stays in sync.
 */
const JsonLd = ({ id, data }: JsonLdProps) => {
  useEffect(() => {
    const scriptId = `jsonld-${id}`;
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = scriptId;
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [id, data]);

  return null;
};

export default JsonLd;
