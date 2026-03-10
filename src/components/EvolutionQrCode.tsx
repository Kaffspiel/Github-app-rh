import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, QrCode } from "lucide-react";

interface EvolutionQrCodeProps {
  instanceName: string;
}

export function EvolutionQrCode({ instanceName }: EvolutionQrCodeProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateQr = async () => {
    if (!instanceName) {
      toast.error("O nome da instância é obrigatório para gerar o QR Code.");
      return;
    }

    setLoading(true);
    setQrCode(null);

    try {
      // Faz requisição para um webhook ou Edge Function que intermedia a Evolution API
      const N8N_WEBHOOK_STATUS = import.meta.env.VITE_N8N_WEBHOOK_STATUS;
      if (!N8N_WEBHOOK_STATUS) {
        throw new Error("Webhook de status não configurado no .env");
      }

      // IMPORTANTE: Ajuste para a URL real da sua API ou webhook do N8n que gerencia a conexão da Evolution.
      const connectUrl = import.meta.env.VITE_N8N_WEBHOOK_CONNECT || N8N_WEBHOOK_STATUS.replace("opscontrol-status", "opscontrol-connect");

      const response = await fetch(connectUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "connect",
          instance: instanceName,
        }),
      });

      if (!response.ok) {
         throw new Error(`Falha na API: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Resposta n8n:", data); // Ajudará a debugar no console do navegador

      // Tenta extrair das chaves mais prováveis devolvidas pela Evolution ou seu sub-nody (n8n)
      const qrCodeString = data?.base64 || data?.qrcode || data?.qrCode || data?.qr;

      if (qrCodeString) {
         setQrCode(qrCodeString);
         toast.success("QR Code gerado com sucesso! Leia com seu WhatsApp.");
      } else if (data?.state === "open" || data?.status === "open") {
         toast.info("A instância já está conectada no WhatsApp.");
      } else if (data?.error) {
         throw new Error(data.error);
      } else {
         toast.warning("API conectada, mas nenhum código localizável. Cheque o console.");
      }

    } catch (error: any) {
      console.error("Erro ao conectar Evolution API:", error);
      if (error.message.includes("Failed to fetch")) {
        toast.error("Erro de Rede (CORS ou Timeout): Verifique se o Webhook 'opscontrol-connect' no N8n permite chamadas do seu domínio ou está ativado.");
      } else {
        toast.error(error.message || "Erro ao gerar QR Code");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50 border-dashed">
      {!qrCode ? (
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <QrCode className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600 max-w-sm">
            Clique no botão abaixo para solicitar um código QR válido e parear este sistema com o WhatsApp da empresa.
          </p>
          <Button onClick={handleGenerateQr} disabled={loading || !instanceName} variant="outline" className="w-full">
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Gerar QR Code"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <div className="p-4 bg-white rounded-xl shadow-sm border">
            {qrCode.startsWith("data:image") ? (
                <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
            ) : (
                <QRCodeSVG value={qrCode} size={256} />
            )}
          </div>
          <p className="text-sm font-medium text-gray-700">Leia o código acima com o seu WhatsApp</p>
          <Button onClick={() => setQrCode(null)} variant="ghost" size="sm">
            Cancelar / Tentar Novamente
          </Button>
        </div>
      )}
    </div>
  );
}
