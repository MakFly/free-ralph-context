"use client"

import * as React from 'react'
import { Link } from "@tanstack/react-router"
import { IconMail as TablerMail } from "@tabler/icons-react"
import type { Icon } from '@tabler/icons-react'

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function NavMain({
  items,
  showContactButton = true,
}: {
  items: Array<{
    title: string
    url: string
    icon?: Icon
  }>
  showContactButton?: boolean
}) {
  const [contactOpen, setContactOpen] = React.useState(false)

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item, index) => (
            <React.Fragment key={item.title}>
              <SidebarMenuItem className="flex items-center gap-2">
                <SidebarMenuButton tooltip={item.title} asChild>
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {showContactButton && index === 0 && (
                  <Dialog open={contactOpen} onOpenChange={setContactOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        className="size-8 group-data-[collapsible=icon]:opacity-0"
                        variant="outline"
                      >
                        <TablerMail />
                        <span className="sr-only">Contact</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="text-lg">Nous contacter</DialogTitle>
                        <DialogDescription>
                          Envoyez-nous un message et nous vous répondrons dans les plus brefs délais.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          // TODO: Implementer l'envoi du formulaire
                          setContactOpen(false)
                        }}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="name">Nom</Label>
                          <Input id="name" placeholder="Votre nom" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" placeholder="votre@email.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="message">Message</Label>
                          <Textarea
                            id="message"
                            placeholder="Votre message..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setContactOpen(false)}
                          >
                            Annuler
                          </Button>
                          <Button type="submit">Envoyer</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </SidebarMenuItem>
            </React.Fragment>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
