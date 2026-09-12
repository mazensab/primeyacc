"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ListingAgent } from "../../types";

const contactFormSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required." }),
  message: z.string().trim().min(1, { message: "Message is required." })
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

type AgentContactFormProps = {
  agent: ListingAgent;
};

export function AgentContactForm({ agent }: AgentContactFormProps) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: "onChange",
    defaultValues: {
      name: agent.name,
      message: agent.message
    }
  });

  useEffect(() => {
    void form.trigger();
  }, []);

  const isSubmitDisabled = !form.formState.isValid;

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(() => undefined)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea className="min-h-20" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={isSubmitDisabled}>
          Send Message
        </Button>
      </form>
    </Form>
  );
}
