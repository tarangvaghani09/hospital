"use client"

import * as React from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

const Combobox = Popover
const ComboboxTrigger = PopoverTrigger
const ComboboxAnchor = Popover.Anchor

const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, ...props }, ref) => (
  <PopoverContent ref={ref} className={cn("w-[--radix-popover-trigger-width] p-0", className)} align="start" {...props} />
))
ComboboxContent.displayName = "ComboboxContent"

const ComboboxList = CommandList
const ComboboxEmpty = CommandEmpty
const ComboboxInput = CommandInput
const ComboboxItem = CommandItem
const ComboboxGroup = CommandGroup

export {
  Combobox,
  ComboboxTrigger,
  ComboboxAnchor,
  ComboboxContent,
  Command as ComboboxCommand,
  ComboboxList,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxGroup,
}
