import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

export function NotificationSettings() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [settings, setSettings] = useState({
        notify_tasks: true,
        notify_in_app: true,
        notify_whatsapp: false,
        notify_time_tracking: true,
        notify_reminders: true,
        notify_announcements: true,
    });

    useEffect(() => {
        async function loadSettings() {
            if (!user?.id) return;

            try {
                const { data, error } = await supabase
                    .from('employees')
                    .select('notify_tasks, notify_in_app, notify_whatsapp, notify_time_tracking, notify_reminders, notify_announcements')
                    .eq('user_id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setSettings({
                        notify_tasks: data.notify_tasks ?? true,
                        notify_in_app: data.notify_in_app ?? true,
                        notify_whatsapp: data.notify_whatsapp ?? false,
                        notify_time_tracking: data.notify_time_tracking ?? true,
                        notify_reminders: data.notify_reminders ?? true,
                        notify_announcements: data.notify_announcements ?? true,
                    });
                }
            } catch (error) {
                console.error('Error loading notification settings:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadSettings();
    }, [user?.id]);

    const handleSave = async () => {
        if (!user?.id) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('employees')
                .update({
                    notify_tasks: settings.notify_tasks,
                    notify_in_app: settings.notify_in_app,
                    notify_whatsapp: settings.notify_whatsapp,
                    notify_time_tracking: settings.notify_time_tracking,
                    notify_reminders: settings.notify_reminders,
                    notify_announcements: settings.notify_announcements,
                })
                .eq('user_id', user.id);

            if (error) throw error;

            toast({
                title: "Configurações salvas",
                description: "Suas preferências de notificação foram atualizadas.",
            });
        } catch (error: any) {
            console.error('Error saving settings:', error);
            toast({
                title: "Erro ao salvar",
                description: "Não foi possível salvar suas configurações.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                    Gerencie como e quando você deseja ser notificado.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <Label className="text-base font-medium">Canais</Label>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="notify-in-app">Notificações no App</Label>
                            <p className="text-sm text-muted-foreground">
                                Exibir alertas dentro do aplicativo (sino de notificações).
                            </p>
                        </div>
                        <Switch
                            id="notify-in-app"
                            checked={settings.notify_in_app}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_in_app: checked }))}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="notify-whatsapp">Notificações via WhatsApp</Label>
                            <p className="text-sm text-muted-foreground">
                                Receber mensagens importantes no WhatsApp cadastrado.
                            </p>
                        </div>
                        <Switch
                            id="notify-whatsapp"
                            checked={settings.notify_whatsapp}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_whatsapp: checked }))}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <Label className="text-base font-medium">Tipos de Notificação</Label>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="notify-tasks">Tarefas</Label>
                            <p className="text-sm text-muted-foreground">
                                Novas tarefas, prazos e conclusões.
                            </p>
                        </div>
                        <Switch
                            id="notify-tasks"
                            checked={settings.notify_tasks}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_tasks: checked }))}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="notify-time-tracking">Controle de Ponto</Label>
                            <p className="text-sm text-muted-foreground">
                                Lembretes de entrada, saída e intervalos.
                            </p>
                        </div>
                        <Switch
                            id="notify-time-tracking"
                            checked={settings.notify_time_tracking}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_time_tracking: checked }))}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="notify-reminders">Lembretes Gerais</Label>
                            <p className="text-sm text-muted-foreground">
                                Avisos gerais e lembretes do sistema.
                            </p>
                        </div>
                        <Switch
                            id="notify-reminders"
                            checked={settings.notify_reminders}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_reminders: checked }))}
                        />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="notify-announcements">Comunicados</Label>
                            <p className="text-sm text-muted-foreground">
                                Comunicados importantes da empresa.
                            </p>
                        </div>
                        <Switch
                            id="notify-announcements"
                            checked={settings.notify_announcements}
                            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_announcements: checked }))}
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Preferências
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
