import { useState, useMemo } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GoogleCalendarButton } from "@/components/GoogleCalendarButton";

export interface CalendarTask {
  id: string;
  title: string;
  due_date?: string | null;
  priority: string;
  description?: string;
  status?: string;
  progress?: number;
  [key: string]: any;
}

interface TaskCalendarProps {
  tasks: CalendarTask[];
  onTaskClick: (task: any) => void;
}

export function TaskCalendar({ tasks, onTaskClick }: TaskCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const tasksByDay = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    tasks.forEach(task => {
      if (task.due_date) {
        const dateKey = format(new Date(task.due_date), 'yyyy-MM-dd');
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(task);
      }
    });
    return map;
  }, [tasks]);

  const getPriorityColor = (priority: string, status?: string) => {
    if (status === 'cancelada') return "bg-slate-200 text-slate-400 opacity-50";
    if (status === 'não feito') return "bg-slate-400 text-white opacity-80";
    
    switch (priority) {
      case "alta": return "bg-red-500 hover:bg-red-600";
      case "média": return "bg-orange-500 hover:bg-orange-600";
      case "baixa": return "bg-blue-500 hover:bg-blue-600";
      default: return "bg-slate-400 hover:bg-slate-500";
    }
  };

  const selectedDayTasks = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDay[key] || [];
  }, [selectedDate, tasksByDay]);


  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluída": 
      case "concluido": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "atrasada": return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "cancelada": return <Trash2 className="w-4 h-4 text-slate-400" />;
      case "não feito": return <AlertCircle className="w-4 h-4 text-slate-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 pb-20 md:pb-0">
      {/* HEADER COMPARTILHADO */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-800 capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="h-9 w-9">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
            className="hidden sm:inline-flex"
          >
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="h-9 w-9">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* VISUALIZAÇÃO MOBILE (AGENDA) */}
      <div className="md:hidden flex flex-col flex-1 gap-4">
        {/* Calendário Compacto */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, idx) => <span key={`${d}-${idx}`}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const hasTasks = !!tasksByDay[dateKey];
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isCurrMonth = isSameMonth(day, monthStart);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all aspect-square ${
                    isSelected ? "bg-primary text-white shadow-md scale-105" : 
                    isToday ? "bg-blue-50 text-primary border border-blue-100" :
                    !isCurrMonth ? "text-slate-200" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-bold">{format(day, "d")}</span>
                  {hasTasks && (
                    <div className={`mt-0.5 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista do Dia */}
        <div className="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-slate-800">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
            <Badge variant="secondary" className="bg-white">{selectedDayTasks.length}</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {selectedDayTasks.map(task => (
                <Card key={task.id} className="border-none shadow-sm cursor-pointer" onClick={() => onTaskClick(task)}>
                  <CardContent className="p-4 flex gap-3 items-center">
                    <div className={`w-1.5 h-10 rounded-full shrink-0 ${getPriorityColor(task.priority, task.status).split(' ')[0]}`} />
                    <div className="flex-1 overflow-hidden">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{task.title}</h4>
                      <p className="text-xs text-slate-400 font-medium">Prazo: {task.due_date ? format(new Date(task.due_date), "HH:mm") : '--:--'}</p>
                    </div>
                    {getStatusIcon(task.status || "")}
                  </CardContent>
                </Card>
              ))}
              {selectedDayTasks.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs italic">Nenhuma tarefa para este dia</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* VISUALIZAÇÃO DESKTOP (GRADE COMPLETA) */}
      <div className="hidden md:block flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 bg-slate-50/80 border-b">
          {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-slate-100 min-h-0">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDay[dateKey] || [];
            const isToday = isSameDay(day, new Date());
            const isCurrMonth = isSameMonth(day, monthStart);

            return (
              <div 
                key={day.toISOString()} 
                className={`min-h-[140px] flex flex-col p-2 transition-colors ${!isCurrMonth ? "bg-slate-50/30" : "bg-white"} ${isToday ? "bg-blue-50/20" : ""}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm font-bold h-7 w-7 flex items-center justify-center rounded-full ${
                    isToday ? "bg-primary text-white" : !isCurrMonth ? "text-slate-300" : "text-slate-600"
                  }`}>
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 0 && <span className="text-[10px] font-bold text-slate-400">{dayTasks.length} {dayTasks.length === 1 ? 'Job' : 'Jobs'}</span>}
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className={`px-2 py-1 rounded text-[10px] text-white font-bold cursor-pointer truncate transition-all hover:brightness-110 active:scale-95 ${getPriorityColor(task.priority, task.status)} ${task.status === 'cancelada' ? 'line-through' : ''}`}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
