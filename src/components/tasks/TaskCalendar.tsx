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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from "lucide-react";
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

  const selectedDayTasks = useMemo(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDay[key] || [];
  }, [selectedDate, tasksByDay]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "alta": return "bg-red-500";
      case "média": return "bg-orange-500";
      case "baixa": return "bg-blue-500";
      default: return "bg-slate-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluída": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "atrasada": return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full gap-4 pb-20">
      {/* HEADER CALENDÁRIO */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {["D", "S", "T", "Q", "Q", "S", "S"].map(d => (
            <span key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</span>
          ))}
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
                  !isCurrMonth ? "text-slate-300" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-semibold">{format(day, "d")}</span>
                {hasTasks && (
                  <div className={`mt-0.5 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* LISTA DE TAREFAS DO DIA */}
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Agenda do dia
            </span>
            <span className="text-lg font-bold text-slate-800">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <Badge variant="secondary" className="h-6 px-2 font-bold bg-white shadow-sm border-slate-100">
            {selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 pb-4">
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map((task) => (
                <Card 
                  key={task.id} 
                  className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => onTaskClick(task)}
                >
                  <CardContent className="p-0 flex items-stretch">
                    <div className={`w-1.5 shrink-0 ${getPriorityColor(task.priority)}`} />
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-slate-800 leading-tight group-hover:text-primary transition-colors">
                          {task.title}
                        </h3>
                        <div className="shrink-0 flex items-center gap-1.5">
                          {getStatusIcon(task.status || "")}
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 italic">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-3">
                           <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                             <Clock className="w-3 h-3" />
                             {task.due_date ? format(new Date(task.due_date), "HH:mm") : '--:--'}
                           </div>
                           <Badge variant="outline" className="text-[9px] h-4 px-1.5 uppercase tracking-tighter opacity-70">
                             {task.priority}
                           </Badge>
                        </div>
                        <GoogleCalendarButton
                          title={task.title}
                          description={task.description}
                          dueDate={task.due_date}
                          size="icon"
                          variant="ghost"
                          showText={false}
                          className="h-8 w-8 text-slate-400 hover:text-primary"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 px-4">
                <div className="bg-white p-4 rounded-full shadow-sm border border-slate-100">
                  <CalendarIcon className="w-8 h-8 text-slate-200" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-600">Nada agendado</span>
                  <p className="text-xs text-slate-400">Não há tarefas com prazo para este dia.</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
