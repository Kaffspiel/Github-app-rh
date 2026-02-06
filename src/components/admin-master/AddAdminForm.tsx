import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const userSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});

type UserFormData = z.infer<typeof userSchema>;

type UserRole = "admin" | "gestor";

interface AddUserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Tables<"companies"> | null;
  onSuccess: () => void;
  role: UserRole;
}

const roleLabels: Record<UserRole, { title: string; description: string; department: string }> = {
  admin: {
    title: "Administrador",
    description: "Criar um novo administrador para a empresa",
    department: "Administração",
  },
  gestor: {
    title: "Gestor",
    description: "Criar um novo gestor para a empresa",
    department: "Gestão",
  },
};

export function AddAdminForm({ open, onOpenChange, company, onSuccess, role }: AddUserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels = roleLabels[role];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormData) => {
    if (!company) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Get current session token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Sessão inválida. Faça login novamente.");
      }

      // Call the create-user edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          role: role,
          department: labels.department,
          companyId: company.id,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Erro ao criar ${labels.title.toLowerCase()}`);
      }

      toast.success(`${labels.title} criado com sucesso!`);
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error(`Error creating ${role}:`, err);
      
      if (err.message?.includes("already registered") || err.message?.includes("já está cadastrado")) {
        setError("Este email já está cadastrado no sistema");
      } else {
        setError(err.message || `Erro ao criar ${labels.title.toLowerCase()}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar {labels.title}</DialogTitle>
          <DialogDescription>
            {labels.description}{" "}
            <strong>{company?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder={`Nome do ${labels.title.toLowerCase()}`}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder={`${labels.title.toLowerCase()}@empresa.com`}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="Mínimo 6 caracteres"
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar {labels.title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
