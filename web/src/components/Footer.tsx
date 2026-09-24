export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-neutral-500 sm:flex-row">
        <p>
          &copy; {year} <span className="text-neutral-300">henrique-cordeiro</span>. Todos os
          direitos reservados.
        </p>
        <p className="text-xs">UFC Preditor &middot; Projeto de Machine Learning</p>
      </div>
    </footer>
  );
}
