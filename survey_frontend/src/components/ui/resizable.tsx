"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"
import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group
      data-slot="resizable-panel-group"
      className={cn("flex h-full w-full", className)}
      {...props}
    />
  )
}

function ResizablePanel(props: React.ComponentProps<typeof Panel>) {
  return <Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean
}) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        // base
        "bg-border focus-visible:ring-ring relative flex items-center justify-center focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
        // vertical separator (default when Group orientation="horizontal")
        "aria-[orientation=vertical]:w-px aria-[orientation=vertical]:h-full",
        // horizontal separator (when Group orientation="vertical")
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        // thicker hit-area via pseudo element
        "after:absolute after:inset-0",
        "aria-[orientation=vertical]:after:left-1/2 aria-[orientation=vertical]:after:w-1 aria-[orientation=vertical]:after:-translate-x-1/2",
        "aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:-translate-y-1/2",
        // rotate the grip when separator is horizontal
        "[&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
