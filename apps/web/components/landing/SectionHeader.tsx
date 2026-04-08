import Link from 'next/link'

interface SectionHeaderProps {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  className?: string
}

export function SectionHeader({
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: SectionHeaderProps) {
  return (
    <div className={['flex items-end justify-between gap-4', className ?? ''].join(' ').trim()}>
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface sm:text-[2rem]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-[62ch] text-sm leading-relaxed text-on-surface-variant sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="shrink-0 inline-flex items-center gap-1 text-sm text-on-surface-variant transition-colors duration-150 hover:text-primary"
        >
          <span>{actionLabel}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <path d="M2.5 8h10" />
            <path d="m8.5 4 4 4-4 4" />
          </svg>
        </Link>
      ) : null}
    </div>
  )
}
