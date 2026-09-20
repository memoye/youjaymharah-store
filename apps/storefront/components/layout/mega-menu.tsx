"use client"

import Image from "next/image"
import NextLink from "next/link"

import { NavigationMenuLink } from "@/components/ui/navigation-menu"
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
        "block p-0 hover:bg-transparent focus:bg-transparent data-active:bg-transparent data-active:hover:bg-transparent data-active:focus:bg-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </NavigationMenuLink>
  )
}

const headingClass =
  "text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"

const linkClass =
  "text-[15px] leading-6 decoration-gold underline-offset-4 transition-colors hover:text-muted-foreground data-active:underline"

const actionClass =
  "text-[12px] font-medium tracking-[0.06em] uppercase underline-offset-4 hover:underline"

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
            alt=""
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        )}
      </span>
      <span className="mt-3 block text-[13px] font-medium">{tile.title}</span>
    </MenuLink>
  )
}

/**
 * A department's mega menu: category columns on the left, up to two
 * collection tiles on the right, and "Shop all" underneath.
 */
export function DepartmentPanel({
  department,
  tiles,
}: {
  department: MenuDepartment
  tiles: CollectionTile[]
}) {
  const active = useActiveMenuItem()
  const promos = tiles
    .filter((tile) => tile.mobileImage ?? tile.image)
    .slice(0, 2)

  const renderColumnHeading = (column: MenuDepartment["columns"][number]) => {
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

  return (
    <div className="container-wrapper grid grid-cols-[1fr_auto] gap-x-12 px-5 pt-10 pb-8 sm:px-6">
      <div className="flex flex-wrap gap-x-16 gap-y-10">
        {department.columns.map((column) => (
          <div key={column.id} className="min-w-40">
            {renderColumnHeading(column)}

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

      {promos.length > 0 && (
        <div className="hidden gap-4 lg:flex">
          {promos.map((tile) => (
            <CollectionTileLink
              key={tile.id}
              tile={tile}
              shape="portrait"
              sizes="176px"
              className="w-44"
            />
          ))}
        </div>
      )}

      <div className="col-span-full mt-10 border-t pt-5">
        <MenuLink
          href={department.href}
          className={cn("inline-flex items-center gap-2", actionClass)}
        >
          Shop all <ArrowRightIcon />
        </MenuLink>
      </div>
    </div>
  )
}

/** The collections menu: a row of banners and "View all collections". */
export function CollectionsPanel({ menu }: { menu: CollectionMenu }) {
  return (
    <div className="container-wrapper px-5 pt-10 pb-8 sm:px-6">
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
