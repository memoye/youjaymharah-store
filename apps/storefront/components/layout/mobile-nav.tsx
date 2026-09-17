"use client"

import {
  CaretLeftIcon,
  CaretRightIcon,
  ListIcon,
  XIcon,
} from "@phosphor-icons/react"
import Image from "next/image"
import NextLink from "next/link"
import { useState, type ReactNode } from "react"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useCatalog } from "@/features/catalog/provider"
import { useActiveMenuItem } from "@/features/catalog/use-active-menu-item"
import { getMenuGroups, type MenuDepartment } from "@/lib/medusa/menu"
import { NEW_ARRIVALS_PATH } from "@/lib/seo/routes"
import { cn } from "@/lib/util/cn"

type View =
  | { kind: "root" }
  | { kind: "department"; departmentId: string }
  | { kind: "group"; departmentId: string; groupId: string }
  | { kind: "collections" }

const rowClass =
  "flex min-h-12 w-full items-center justify-between gap-4 border-b py-3 text-left text-[15px] outline-none focus-visible:underline"

const actionClass =
  "mt-6 inline-block text-[12px] font-medium tracking-[0.06em] uppercase underline underline-offset-4"

/**
 * The mobile menu: a drawer from the left that drills down one level at a
 * time. With one department its groups (Clothing, Accessories) are the first
 * level; with several, the departments are.
 */
export function MobileNav() {
  const { menu, collectionMenu } = useCatalog()
  const active = useActiveMenuItem()
  const [open, setOpen] = useState(false)
  const [stack, setStack] = useState<View[]>([{ kind: "root" }])

  const view = stack[stack.length - 1]
  const push = (next: View) => setStack((current) => [...current, next])
  const back = () => setStack((current) => current.slice(0, -1))
  const close = () => setOpen(false)

  const findDepartment = (id: string) =>
    menu.departments.find((department) => department.id === id)

  const sole = menu.showDepartments ? undefined : menu.departments[0]

  const link = (href: string, label: ReactNode, current = false) => (
    <NextLink
      href={href}
      onClick={close}
      aria-current={current ? "page" : undefined}
      className={cn(
        rowClass,
        current && "underline decoration-gold underline-offset-4",
      )}
    >
      {label}
    </NextLink>
  )

  const drill = (label: string, next: View) => (
    <button type="button" className={rowClass} onClick={() => push(next)}>
      {label}
      <CaretRightIcon size={14} aria-hidden />
    </button>
  )

  const departmentRows = (department: MenuDepartment) => (
    <>
      {getMenuGroups(department).map((group) => (
        <li key={group.id}>
          {drill(group.heading ?? "", {
            kind: "group",
            departmentId: department.id,
            groupId: group.id,
          })}
        </li>
      ))}
      <li>
        <NextLink
          href={department.href}
          onClick={close}
          className={actionClass}
        >
          Shop all
        </NextLink>
      </li>
    </>
  )

  let title = "Menu"
  let body: ReactNode = null

  if (view.kind === "root") {
    body = (
      <ul>
        {menu.showDepartments
          ? menu.departments.map((department) => (
              <li key={department.id}>
                {department.columns.length
                  ? drill(department.label, {
                      kind: "department",
                      departmentId: department.id,
                    })
                  : link(department.href, department.label)}
              </li>
            ))
          : sole &&
            (sole.columns.length ? (
              getMenuGroups(sole).map((group) => (
                <li key={group.id}>
                  {drill(group.heading ?? "", {
                    kind: "group",
                    departmentId: sole.id,
                    groupId: group.id,
                  })}
                </li>
              ))
            ) : (
              <li>{link(sole.href, "Shop")}</li>
            ))}
        <li>{link(NEW_ARRIVALS_PATH, "New arrivals")}</li>
        {collectionMenu.display === "menu" && (
          <li>{drill("Collections", { kind: "collections" })}</li>
        )}
        {collectionMenu.display === "link" && (
          <li>{link(collectionMenu.href, collectionMenu.tiles[0].title)}</li>
        )}
        {sole && sole.columns.length > 0 && (
          <li>
            <NextLink href={sole.href} onClick={close} className={actionClass}>
              Shop all
            </NextLink>
          </li>
        )}
      </ul>
    )
  } else if (view.kind === "department") {
    const department = findDepartment(view.departmentId)
    title = department?.label ?? title
    body = department && <ul>{departmentRows(department)}</ul>
  } else if (view.kind === "group") {
    const department = findDepartment(view.departmentId)
    const group = department
      ? getMenuGroups(department).find((g) => g.id === view.groupId)
      : undefined
    title = group?.heading ?? title
    body = group && (
      <ul>
        {group.links.map((item) => (
          <li key={item.id}>
            {link(item.href, item.label, active.href === item.href)}
          </li>
        ))}
        {group.href && (
          <li>
            <NextLink href={group.href} onClick={close} className={actionClass}>
              View all
            </NextLink>
          </li>
        )}
      </ul>
    )
  } else {
    title = "Collections"
    body = (
      <>
        <ul className="flex flex-col gap-6 pt-2">
          {collectionMenu.tiles.map((tile) => {
            const src = tile.image ?? tile.mobileImage
            return (
              <li key={tile.id}>
                <NextLink href={tile.href} onClick={close} className="block">
                  <span className="relative block aspect-2/1 overflow-hidden bg-muted">
                    {src && (
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="(max-width: 400px) 100vw, 22rem"
                        className="object-cover"
                      />
                    )}
                  </span>
                  <span className="mt-2 block text-[15px]">{tile.title}</span>
                </NextLink>
              </li>
            )
          })}
        </ul>
        <NextLink
          href={collectionMenu.href}
          onClick={close}
          className={actionClass}
        >
          View all collections
        </NextLink>
      </>
    )
  }

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) setStack([{ kind: "root" }])
      }}
      swipeDirection="left"
    >
      <DrawerTrigger
        aria-label="Open menu"
        className="-ml-2 inline-flex size-10 items-center justify-center md:hidden"
      >
        <ListIcon size={20} />
      </DrawerTrigger>
      <DrawerContent>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-10">
          <div className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between bg-popover">
            {stack.length > 1 ? (
              <button
                type="button"
                onClick={back}
                className="-ml-2 inline-flex size-10 items-center justify-center"
                aria-label="Back"
              >
                <CaretLeftIcon size={18} />
              </button>
            ) : (
              <span className="size-10" aria-hidden />
            )}
            <DrawerTitle className="text-[13px] font-medium tracking-[0.02em]">
              {title}
            </DrawerTitle>
            <DrawerClose
              aria-label="Close menu"
              className="-mr-2 inline-flex size-10 items-center justify-center"
            >
              <XIcon size={18} />
            </DrawerClose>
          </div>
          <nav aria-label="Catalogue">{body}</nav>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
