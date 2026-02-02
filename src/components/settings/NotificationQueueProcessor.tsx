import { useEffect } from 'react';
import { useNotificationContext } from '@/context/NotificationContext';
import { notificationService } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

export function NotificationQueueProcessor() {
    const { queue, updateQueueItem, removeFromQueue } = useNotificationContext();
    const { toast } = useToast();

    useEffect(() => {
        // Find next item to process
        const pendingItem = queue.find(item => item.status === 'queued' || item.status === 'retrying');

        if (!pendingItem) return;

        const processItem = async () => {
            try {
                // Mark as processing
                updateQueueItem(pendingItem.id, { status: 'processing' });

                // Send to n8n
                const response = await fetch(pendingItem.webhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(pendingItem.payload),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // Success
                console.log('Notification sent successfully:', pendingItem.id);
                updateQueueItem(pendingItem.id, { status: 'sent' });

                // Remove from queue after short delay to keep history clean? 
                // Or keep it? The context handles removal if needed. 
                // For now, let's remove it to prevent queue bloat.
                removeFromQueue(pendingItem.id);

            } catch (error) {
                console.error('Error processing notification queue item:', error);

                const newAttempts = (pendingItem.attempts || 0) + 1;
                const maxAttempts = pendingItem.maxAttempts || 3;

                if (newAttempts >= maxAttempts) {
                    // Failed permanently
                    updateQueueItem(pendingItem.id, {
                        status: 'failed',
                        response: {
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                            timestamp: new Date().toISOString()
                        },
                        attempts: newAttempts
                    });

                    toast({
                        title: "Erro no envio de notificação",
                        description: "Falha ao conectar com o servidor de mensagens.",
                        variant: "destructive"
                    });
                } else {
                    // Retry later (simple backoff could be added here, but for now just mark for retry)
                    // We'll set it back to 'retrying' so the effect picks it up again? 
                    // Ideally we should wait.
                    updateQueueItem(pendingItem.id, {
                        status: 'retrying',
                        attempts: newAttempts
                    });
                }
            }
        };

        processItem();
    }, [queue, updateQueueItem, removeFromQueue, toast]);

    // This component doesn't render anything
    return null;
}
