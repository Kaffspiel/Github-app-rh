import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface EmployeeProfile {
    id: string;
    name: string;
    email: string;
    department: string;
    role: string;
    whatsapp_number: string | null;
}

interface CollaboratorProfileProps {
    profile: EmployeeProfile | null;
    userEmail: string | undefined;
}

export default function CollaboratorProfile({ profile, userEmail }: CollaboratorProfileProps) {
    const { signOut } = useAuth();

    return (
        <div className="p-4 space-y-4">
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                        <Avatar className="h-20 w-20 mb-4">
                            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                                {profile?.name?.charAt(0) || userEmail?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="text-xl font-semibold">{profile?.name || "Colaborador"}</h2>
                        <p className="text-gray-500">{profile?.department || "Departamento"}</p>
                        <Badge className="mt-2" variant="secondary">{profile?.role || "colaborador"}</Badge>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-2">
                <Card>
                    <CardContent className="p-4 flex flex-col gap-4">
                        <h3 className="font-semibold text-sm text-gray-500 uppercase">Informações</h3>

                        <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">Email</span>
                            <span className="font-medium">{profile?.email || userEmail}</span>
                        </div>

                        <div className="flex justify-between py-2 border-b">
                            <span className="text-gray-600">WhatsApp</span>
                            <span className="font-medium">{profile?.whatsapp_number || "Não cadastrado"}</span>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => signOut()}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair da Conta
                </Button>
            </div>
        </div>
    );
}
