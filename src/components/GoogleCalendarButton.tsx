import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format, addHours } from "date-fns";

interface GoogleCalendarButtonProps {
  title: string;
  description?: string;
  location?: string;
  dueDate?: string | null;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showText?: boolean;
}

export function GoogleCalendarButton({
  title,
  description = "",
  location = "",
  dueDate,
  variant = "outline",
  size = "sm",
  className = "",
  showText = true,
}: GoogleCalendarButtonProps) {
  const generateGoogleCalendarUrl = () => {
    const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
    const encodedTitle = encodeURIComponent(title);
    const encodedDetails = encodeURIComponent(description);
    const encodedLocation = encodeURIComponent(location);

    let dates = "";
    if (dueDate) {
      try {
        const startDate = new Date(dueDate);
        // Se a data for inválida, evitamos quebrar
        if (isNaN(startDate.getTime())) {
           return null;
        }
        
        const endDate = addHours(startDate, 1);

        // Converte para ISO string (UTC) e remove caracteres especiais: - : .000
        const formatUTC = (date: Date) => 
          date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

        const startStr = formatUTC(startDate);
        const endStr = formatUTC(endDate);
        dates = `${startStr}/${endStr}`;
      } catch (e) {
        console.error("Error formatting date for Google Calendar", e);
        return null;
      }
    }

    let url = `${baseUrl}&text=${encodedTitle}`;
    if (dates) url += `&dates=${dates}`;
    if (encodedDetails) url += `&details=${encodedDetails}`;
    if (encodedLocation) url += `&location=${encodedLocation}`;

    return url;
  };

  const url = generateGoogleCalendarUrl();

  if (!url) return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 ${className}`}
      onClick={() => window.open(url, "_blank")}
      title="Adicionar ao Google Agenda"
    >
      <Calendar className="w-4 h-4" />
      {showText && <span>Google Agenda</span>}
    </Button>
  );
}
