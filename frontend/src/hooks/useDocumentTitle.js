import { useEffect } from 'react';

export default function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · CampusLoop` : 'CampusLoop · Buy. Sell. Connect.';
  }, [title]);
}
