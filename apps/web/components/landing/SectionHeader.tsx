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
    <div className={['flex items-start justify-between gap-4', className ?? ''].join(' ').trim()}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-4 w-0.5 rounded-full bg-primary/50 shrink-0 mt-1" />
          <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface sm:text-[2rem]">
            {title}
          </h2>
        </div>
        {description ? (
          <p className="max-w-[62ch] text-sm leading-relaxed text-on-surface-variant sm:text-base pl-3.5">
            {description}
          </p>
        ) : null}
      </div>

      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="group/link shrink-0 inline-flex items-center gap-1 text-sm text-on-surface-variant transition-colors duration-150 hover:text-primary mt-1"
        >
          <span>{actionLabel}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 14 14"
            width="14"
            height="14"
            className="opacity-0 group-hover/link:opacity-100 -translate-x-1 group-hover/link:translate-x-0 transition-all duration-150"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7h8M7.5 4l3 3-3 3" />
          </svg>
        </Link>
      ) : null}
    </div>
  )
}
