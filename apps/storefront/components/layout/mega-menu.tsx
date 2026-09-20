"use client"

import Image from "next/image"
import NextLink from "next/link"

import { NavigationMenuLink } from "@/components/ui/navigation-menu"
import type { StoreMenuPromo } from "@/features/catalog/provider"
import { useActiveMenuItem } from "@/features/catalog/use-active-menu-item"
import type {
  CollectionMenu,
  CollectionTile,
  MenuDepartment,
} from "@/lib/medusa/menu"
import { cn } from "@/lib/util/cn"
import { ArrowRightIcon } from "@phosphor-icons/react"

type NavigationMenuLinkProps = React.ComponentProps<typeof NavigationMenuLink>

/**
 * A menu link that routes client-side and closes the menu. Drops the kit's
 * padded, shaded link look for plain text; pass `className` to style it.
 */
export function MenuLink({
  href,
  className,
  children,
  ...props
}: Omit<NavigationMenuLinkProps, "href" | "render"> & { href: string }) {
  return (
    <NavigationMenuLink
      render={<NextLink href={href} />}
      closeOnClick
      className={cn(
        "block p-0 hover:bg-transparent focus:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring data-active:bg-transparent data-active:hover:bg-transparent data-active:focus:bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </NavigationMenuLink>
  )
}

const headingClass =
  "text-sm font-semibold tracking-[0.08em] text-muted-foreground uppercase"

const linkClass =
  "leading-6 decoration-gold underline-offset-4 transition-colors hover:text-muted-foreground data-active:underline"

const actionClass =
  "text-xs font-medium tracking-[0.06em] uppercase underline-offset-4 hover:underline"

/**
 * The image transition, kept identical for promos and collection tiles and
 * switched off for anyone who asked for less motion.
 */
const imageClass =
  "object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"

/**
 * A department's mega menu: category columns on the left, the curated promo
 * cards (Settings -> Storefront -> Navigation, at most two) filling the right
 * side, and "Shop all" under the columns.
 *
 * The panel is as tall as its content up to the space below the header
 * (`--available-height`, set by the menu positioner); past that the category
 * side scrolls on its own so the promos stay put.
 */
export function DepartmentPanel({
  department,
  promos,
}: {
  department: MenuDepartment
  promos: StoreMenuPromo[]
}) {
  const active = useActiveMenuItem()

  return (
    <div className="container-wrapper flex max-h-(--available-height,80vh) items-stretch gap-10 px-5 sm:px-6 xl:gap-16">
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto py-10">
        <div className="flex flex-wrap gap-x-12 gap-y-10">
          {department.columns.map((column) => (
            <div key={column.id} className="min-w-40">
              <ColumnHeading column={column} />

              <ul
                aria-label={column.heading ?? undefined}
                className="mt-4 flex flex-col gap-2"
              >
                {column.links.map((link) => (
                  <li key={link.id}>
                    <MenuLink
                      href={link.href}
                      active={active.href === link.href}
                      className={linkClass}
                    >
                      {link.label}
                    </MenuLink>
                  </li>
                ))}
                {column.moreHref && (
                  <li className="pt-1">
                    <MenuLink href={column.moreHref} className={actionClass}>
                      View all
                    </MenuLink>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t pt-5">
          <MenuLink
            href={department.href}
            className={cn("inline-flex items-center gap-2", actionClass)}
          >
            Shop all <ArrowRightIcon />
          </MenuLink>
        </div>
      </div>

      {[promos].length > 0 && (
        <div
          className={cn(
            "hidden shrink-0 gap-4 lg:flex",
            promos.length > 1 ? "w-104 xl:w-136" : "w-76 xl:w-[24rem]",
          )}
        >
          {promos.map((promo) => (
            <PromoCard
              key={promo.href}
              promo={promo}
              alone={promos.length === 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * A promo card, stretched to the panel's height. On its own it gets the
 * editorial Bodoni title; paired, the tiles are too narrow for Bodoni, so the
 * titles stay in Montserrat.
 */
function PromoCard({
  promo,
  alone,
}: {
  promo: StoreMenuPromo
  alone: boolean
}) {
  return (
    <MenuLink
      href={promo.href}
      className="group relative min-h-84 flex-1 overflow-hidden bg-muted"
    >
      <Image
        src={promo.mobile_image_url ?? promo.image_url}
        alt=""
        fill
        sizes={
          alone
            ? "(min-width: 1280px) 24rem, 19rem"
            : "(min-width: 1280px) 17rem, 13rem"
        }
        className={imageClass}
      />

      <span className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-3 bg-gradient-to-t from-black/65 via-black/35 to-transparent p-6 pt-16 text-white">
        <span
          className={cn(
            "block text-balance",
            alone
              ? "font-display text-[2rem] leading-[1.05] xl:text-display-md"
              : "text-[13px] leading-5 font-medium tracking-[0.02em]",
          )}
        >
          {promo.title}
        </span>

        <span
          className={cn(
            actionClass,
            "inline-flex items-center gap-2 text-white/85 group-hover:text-white",
          )}
        >
          Shop now <ArrowRightIcon />
        </span>
      </span>
    </MenuLink>
  )
}

function ColumnHeading({
  column,
}: {
  column: MenuDepartment["columns"][number]
}) {
  if (column.heading === null) {
    return (
      <p aria-hidden className={cn(headingClass, "invisible")}>
        &nbsp;
      </p>
    )
  }

  if (column.href) {
    return (
      <MenuLink
        href={column.href}
        className={cn(headingClass, "hover:text-foreground")}
      >
        {column.heading}
      </MenuLink>
    )
  }

  return <p className={headingClass}>{column.heading}</p>
}

/**
 * One tile per collection, with its portrait banner in the shop menu and its
 * landscape banner in the collections menu.
 */
export function CollectionTileLink({
  tile,
  shape,
  sizes,
  className,
}: {
  tile: CollectionTile
  shape: "portrait" | "landscape"
  sizes: string
  className?: string
}) {
  const src =
    shape === "portrait"
      ? (tile.mobileImage ?? tile.image)
      : (tile.image ?? tile.mobileImage)

  return (
    <MenuLink href={tile.href} className={cn("group block", className)}>
      <span
        className={cn(
          "relative block overflow-hidden bg-muted",
          shape === "portrait" ? "aspect-4/5" : "aspect-2/1",
        )}
      >
        {src && (
          <Image
            src={src}
            className={imageClass}
            sizes={sizes}
            fill
            alt={tile.title || ""}
          />
        )}
      </span>
      <span className="mt-3 block text-[13px] font-medium">{tile.title}</span>
    </MenuLink>
  )
}

/** The collections menu: a row of banners and "View all collections". */
export function CollectionsPanel({ menu }: { menu: CollectionMenu }) {
  return (
    <div className="container-wrapper max-h-[var(--available-height,80vh)] overflow-y-auto px-5 pt-10 pb-8 sm:px-6">
      <ul
        className="grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${menu.tiles.length}, minmax(0, 1fr))`,
        }}
      >
        {menu.tiles.map((tile) => (
          <li key={tile.id}>
            <CollectionTileLink
              tile={tile}
              shape="landscape"
              sizes="(min-width: 1600px) 380px, 25vw"
            />
            {tile.description && (
              <p className="mt-1 line-clamp-2 text-[13px] text-muted-foreground">
                {tile.description}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-10 border-t pt-5">
        <MenuLink href={menu.href} className={actionClass}>
          View all collections
        </MenuLink>
      </div>
    </div>
  )
}
