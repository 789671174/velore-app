import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  modifiersClassNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex items-center justify-center pt-1 relative",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center space-x-1",
        nav_button: cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent bg-transparent p-0 text-muted-foreground transition",
          "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "grid grid-cols-7",
        head_cell: "text-center text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground",
        row: "grid grid-cols-7 gap-1",
        cell: cn(
          "relative aspect-square text-center text-sm", 
          "focus-within:relative focus-within:z-20",
        ),
        day: cn(
          "relative grid h-full place-items-center rounded-md text-sm font-medium leading-none transition-colors",
          "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        ),
        day_selected: "bg-primary text-primary-foreground shadow",
        day_today: "border border-primary/40 bg-primary/10 text-primary",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-40 line-through",
        day_range_middle: "rounded-none bg-primary/20 text-primary", 
        day_hidden: "invisible",
        ...classNames,
      }}
      modifiersClassNames={{
        ...modifiersClassNames,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
