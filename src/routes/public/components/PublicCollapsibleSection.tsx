import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PublicLinkBlock } from './PublicLinkBlock'
import type { Link } from '@/features/links/useLinks'
import type { CollapsibleLinkSection } from '@/features/public/groupPublicLinks'

interface PublicCollapsibleSectionProps {
  section: CollapsibleLinkSection
  onInteract: (link: Link) => void
}

export function PublicCollapsibleSection({ section, onInteract }: PublicCollapsibleSectionProps) {
  return (
    <Collapsible defaultOpen={false} className="w-full">
      <p className="pt-2 pb-1 text-center text-xs font-semibold tracking-wide text-white/70 uppercase">
        {section.title.label}
      </p>
      <CollapsibleTrigger className="group flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/25 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-white/30">
        Ver mais
        <ChevronDown className="size-4 transition-transform group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 flex flex-col gap-3">
        {section.children.map((link) => (
          <PublicLinkBlock key={link.id} link={link} onInteract={onInteract} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
