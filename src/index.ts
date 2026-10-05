interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STREAM_QUEUE: Queue;
}

export default {
  async queue(batch: MessageBatch<unknown>, env: Env): Promise<void> {
    console.log(`[W2] Received ${batch.messages.length} messages`);
    for (const message of batch.messages) {
      console.log("[W2] Body:", JSON.stringify(message.body));
      message.ack();
    }
  },
} satisfies ExportedHandler<Env>;
