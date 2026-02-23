import { useEffect, useRef } from 'react';

// Global keyboard shortcut handler component
function KeyboardShortcutHandler({ children, onCommandPalette }) {
  const capturedPaletteRef = useRef(null);

  useEffect(() => {
    // Store command palette handler
    if (onCommandPalette) {
      capturedPaletteRef.current = onCommandPalette;
    }
  }, [onCommandPalette]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if event is from an input, textarea, or contenteditable
      const target = event.target;
      const isTextInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true';

      // Build shortcut string
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
      const modKey = isMac ? event.metaKey : event.ctrlKey;

      // Command palette (Cmd/Ctrl+K)
      if (modKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (capturedPaletteRef.current) {
          capturedPaletteRef.current();
        }
      }

      // New contact (Cmd/Ctrl+N) - only if not in text input
      if (!isTextInput && modKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        // Dispatch custom event that components can listen for
        window.dispatchEvent(new CustomEvent('shortcut:new-contact'));
      }

      // Escape to close modals
      if (event.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('shortcut:escape'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return children;
}

export default KeyboardShortcutHandler;
