'use client';

import NextLink from 'next/link';
import { ChevronDown } from 'lucide-react';
import {
  cn,
  DrawerClose,
  DropdownContent,
  DropdownGroup,
  DropdownGroupLabel,
  DropdownItem,
  DropdownRoot,
  DropdownTrigger,
} from '@tnsi/ui';
import { programsOverviewContent } from '@/content/programs';

const { pathways, pathwayGroups } = programsOverviewContent;

const groupedPathways = pathwayGroups
  .map((group) => ({ group, pathways: pathways.filter((pathway) => pathway.category === group) }))
  .filter(({ pathways: groupPathways }) => groupPathways.length > 0);

/**
 * Desktop header's "Programs" item, upgraded from a flat link to a menu
 * exposing all five pathways (grouped exactly as the Our Pathways page
 * groups them, so the two never disagree) - Caroline's feedback was that a
 * single link hid how much is actually on offer. Built on the existing
 * Dropdown primitive (Base UI Menu) rather than a bespoke popover, so
 * keyboard/roving-focus/typeahead behaviour is the same as any other menu
 * in the design system.
 */
export function ProgramsDesktopMenu() {
  return (
    <DropdownRoot>
      <DropdownTrigger
        className={cn(
          'interaction-colors interaction-focus text-foreground hover:text-muted-foreground flex items-center gap-1 text-sm',
          'data-[popup-open]:text-muted-foreground',
        )}
      >
        Programs
        <ChevronDown className="size-3.5 transition-transform data-[popup-open]:rotate-180" />
      </DropdownTrigger>
      <DropdownContent
        align="start"
        sideOffset={20}
        className="w-[min(92vw,760px)] max-w-none p-(--space-xl)"
      >
        <div className="grid grid-cols-2 gap-x-(--space-xl) gap-y-(--space-lg) sm:grid-cols-4">
          {groupedPathways.map(({ group, pathways: groupPathways }) => (
            <DropdownGroup key={group} className="flex flex-col gap-(--space-xs)">
              <DropdownGroupLabel className="text-muted-foreground px-2 pb-(--space-2xs) font-mono text-xs tracking-[0.15em] uppercase">
                {group}
              </DropdownGroupLabel>
              {groupPathways.map((pathway) => (
                <DropdownItem
                  key={pathway.id}
                  render={<NextLink href={pathway.cta.href} />}
                  className="flex-col items-start gap-(--space-3xs) px-2 py-(--space-xs)"
                >
                  <span className="font-heading text-foreground text-sm font-semibold">
                    {pathway.title}
                  </span>
                  <span className="text-muted-foreground text-xs leading-snug">
                    {pathway.tagline}
                  </span>
                </DropdownItem>
              ))}
            </DropdownGroup>
          ))}
        </div>

        <div className="border-border mt-(--space-lg) flex items-center justify-between border-t pt-(--space-lg)">
          <NextLink href="/programs" className="interaction-text-link-underline">
            View all pathways →
          </NextLink>
        </div>
      </DropdownContent>
    </DropdownRoot>
  );
}

/**
 * Mobile drawer's "Programs" item - same five pathways, same grouping, but
 * as an inline disclosure rather than a popover menu (a floating panel
 * inside an already-open drawer would fight it for space on small
 * screens). Only the pathway links close the drawer (via DrawerClose); the
 * disclosure toggle itself does not.
 */
export function ProgramsMobileMenu({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-(--space-md)">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="interaction-colors interaction-focus text-foreground hover:text-muted-foreground flex w-full items-center justify-between text-base"
      >
        Programs
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen ? (
        <div className="flex flex-col gap-(--space-lg) pl-(--space-md)">
          {groupedPathways.map(({ group, pathways: groupPathways }) => (
            <div key={group} className="flex flex-col gap-(--space-xs)">
              <p className="text-muted-foreground font-mono text-xs tracking-[0.15em] uppercase">
                {group}
              </p>
              {groupPathways.map((pathway) => (
                <DrawerClose
                  key={pathway.id}
                  nativeButton={false}
                  render={
                    <NextLink
                      href={pathway.cta.href}
                      className="interaction-text-link text-foreground text-sm"
                    >
                      {pathway.title}
                    </NextLink>
                  }
                />
              ))}
            </div>
          ))}

          <DrawerClose
            nativeButton={false}
            render={
              <NextLink href="/programs" className="interaction-text-link-underline text-sm">
                View all pathways →
              </NextLink>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
