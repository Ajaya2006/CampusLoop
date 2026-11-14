import useDocumentTitle from '../hooks/useDocumentTitle';
import notFoundArt from '../assets/errors/not-found.png';

export default function NotFound() {
  useDocumentTitle('Page not found');

  return (
    <section className="grid min-h-[calc(100svh-12rem)] place-items-center px-3 py-4 md:min-h-[calc(100svh-14rem)]">
      <img
        src={notFoundArt}
        alt="Page not found"
        className="block h-auto max-h-[calc(100svh-15rem)] w-full max-w-[900px] object-contain drop-shadow-[0_16px_12px_rgb(104_64_29/0.03)] dark:drop-shadow-[0_18px_30px_rgb(0_0_0/0.22)]"
      />
    </section>
  );
}
