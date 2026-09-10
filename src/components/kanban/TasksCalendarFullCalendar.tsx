"use client";

import { forwardRef } from "react";
import type { CalendarOptions } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";

const TasksCalendarFullCalendar = forwardRef<FullCalendar, CalendarOptions>((props, ref) => (
  <FullCalendar ref={ref} {...props} />
));

TasksCalendarFullCalendar.displayName = "TasksCalendarFullCalendar";

export default TasksCalendarFullCalendar;
