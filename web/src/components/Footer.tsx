export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-800 bg-neutral-950">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-neutral-500">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p>
            &copy; {year} <span className="text-neutral-300">henrique-cordeiro</span>. Todos os
            direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/HenriqueCDS/ufc-preditor"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-neutral-200"
            >
              Código no GitHub
            </a>
            <p className="text-xs">UFC Preditor &middot; Projeto de Machine Learning</p>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-neutral-600">
          Projeto educacional e independente, sem qualquer afiliação, patrocínio ou aprovação
          do UFC ou da Zuffa/TKO. Os dados são coletados publicamente do ufcstats.com apenas
          para fins de estudo. As previsões são estimativas estatísticas de um modelo de
          Machine Learning, não têm garantia de acerto e não devem ser usadas como
          recomendação para apostas.
        </p>
      </div>
    </footer>
  );
}
