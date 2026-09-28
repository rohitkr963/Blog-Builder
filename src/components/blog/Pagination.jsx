export default function Pagination({ currentPage, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={disabled || currentPage === 1}
        className="ui-btn ui-btn-secondary min-h-10 px-3 text-sm disabled:opacity-50"
      >
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          disabled={disabled}
          className={`min-h-10 min-w-10 rounded-lg border px-3 text-sm font-medium transition ${
            page === currentPage
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--on-accent)]"
              : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={disabled || currentPage === totalPages}
        className="ui-btn ui-btn-secondary min-h-10 px-3 text-sm disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}
