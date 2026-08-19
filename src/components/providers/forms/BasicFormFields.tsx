import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ImeSafeInput } from "@/components/ui/ime-safe-input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { ProviderIcon } from "@/components/ProviderIcon";
import { IconPicker } from "@/components/IconPicker";
import { getIconMetadata } from "@/icons/extracted/metadata";
import type { UseFormReturn } from "react-hook-form";
import type { ProviderFormData } from "@/lib/schemas/provider";

interface BasicFormFieldsProps {
  form: UseFormReturn<ProviderFormData>;
  /** Slot to render content between icon and name fields */
  beforeNameSlot?: ReactNode;
}

export function BasicFormFields({
  form,
  beforeNameSlot,
}: BasicFormFieldsProps) {
  const { t } = useTranslation();
  const [iconDialogOpen, setIconDialogOpen] = useState(false);

  const currentIcon = form.watch("icon");
  const currentIconColor = form.watch("iconColor");
  const providerName = form.watch("name") || "Provider";
  const effectiveIconColor =
    currentIconColor ||
    (currentIcon ? getIconMetadata(currentIcon)?.defaultColor : undefined);

  const handleIconSelect = (icon: string) => {
    const meta = getIconMetadata(icon);
    form.setValue("icon", icon);
    form.setValue("iconColor", meta?.defaultColor ?? "");
  };

  return (
    <>
      {beforeNameSlot}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("provider.name")}</FormLabel>
              <div className="flex gap-2">
                <Dialog open={iconDialogOpen} onOpenChange={setIconDialogOpen}>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-input bg-muted/30 transition-colors hover:border-primary hover:bg-muted/60"
                      title={
                        currentIcon
                          ? t("providerIcon.clickToChange", {
                              defaultValue: "点击更换图标",
                            })
                          : t("providerIcon.clickToSelect", {
                              defaultValue: "点击选择图标",
                            })
                      }
                    >
                      <ProviderIcon
                        icon={currentIcon}
                        name={providerName}
                        color={effectiveIconColor}
                        size={24}
                      />
                    </button>
                  </DialogTrigger>
                  <DialogContent
                    variant="fullscreen"
                    zIndex="top"
                    overlayClassName="bg-[hsl(var(--background))] backdrop-blur-0"
                    className="p-0 sm:rounded-none"
                  >
                    <div className="flex h-full flex-col">
                      <div className="flex-shrink-0 border-b border-border-default bg-muted/40 py-4">
                        <div className="flex items-center gap-4 px-6">
                          <DialogClose asChild>
                            <Button type="button" variant="outline" size="icon">
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                          </DialogClose>
                          <p className="text-lg font-semibold leading-tight">
                            {t("providerIcon.selectIcon", {
                              defaultValue: "选择图标",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <div className="w-full space-y-2 px-6 py-6">
                          <IconPicker
                            value={currentIcon}
                            onValueChange={handleIconSelect}
                            color={effectiveIconColor}
                          />
                          <div className="flex justify-end gap-2">
                            <DialogClose asChild>
                              <Button type="button" variant="outline">
                                {t("common.done", { defaultValue: "完成" })}
                              </Button>
                            </DialogClose>
                          </div>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <FormControl>
                  <ImeSafeInput
                    ref={field.ref}
                    name={field.name}
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={field.disabled}
                    className="min-w-0"
                    placeholder={t("provider.namePlaceholder")}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("provider.notes")}</FormLabel>
              <FormControl>
                <ImeSafeInput
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={field.disabled}
                  placeholder={t("provider.notesPlaceholder")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="websiteUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("provider.websiteUrl")}</FormLabel>
              <FormControl>
                <ImeSafeInput
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={field.disabled}
                  placeholder={t("providerForm.websiteUrlPlaceholder")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
