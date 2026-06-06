import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  createZoneSchema,
  updateZoneSchema,
  type Zone,
  type CreateZonePayload,
  type UpdateZonePayload,
} from '@/entities/zone/schemas';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import { ZoneMapPicker } from '../zone-map-picker';

interface ZoneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone?: Zone | null;
  otherZones?: Zone[];
  onSubmit: (data: CreateZonePayload | UpdateZonePayload) => Promise<void>;
  loading?: boolean;
}

export function ZoneFormDialog({
  open,
  onOpenChange,
  zone,
  otherZones = [],
  onSubmit,
  loading,
}: ZoneFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!zone;

  const form = useForm<CreateZonePayload>({
    resolver: zodResolver(isEdit ? updateZoneSchema : createZoneSchema),
    defaultValues: {
      name: '',
      lat: 0,
      lng: 0,
      radius_m: 100,
      active: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: zone?.name || '',
        lat: zone?.lat || 0,
        lng: zone?.lng || 0,
        radius_m: zone?.radius_m || 100,
        active: zone?.active ?? true,
      });
    }
  }, [open, zone, form]);

  const handleSubmit = async (values: CreateZonePayload) => {
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch {
      // Handled by parent
    }
  };

  const handleMapPositionChange = React.useCallback(
    (lat: number, lng: number) => {
      form.setValue('lat', Number(lat.toFixed(6)), { shouldValidate: true, shouldDirty: true });
      form.setValue('lng', Number(lng.toFixed(6)), { shouldValidate: true, shouldDirty: true });
    },
    [form]
  );

  const watchedLat = form.watch('lat');
  const watchedLng = form.watch('lng');
  const watchedRadius = form.watch('radius_m');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('zones.dialog.editTitle', 'Edit Zone') : t('zones.dialog.createTitle', 'Create Zone')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>{t('zones.fields.name', 'Zone Name')} *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('zones.fields.namePlaceholder', 'e.g. Headquarters')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('zones.fields.lat', 'Latitude')} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lng"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('zones.fields.lng', 'Longitude')} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.000001"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="radius_m"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('zones.fields.radius', 'Radius (meters)')} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm sm:mt-6">
                    <div className="space-y-0.5">
                      <FormLabel>{t('zones.fields.active', 'Active')}</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>{t('zones.fields.mapPicker', 'Pick on Map')}</FormLabel>
              <div className="text-sm text-muted-foreground mb-2">
                {t('zones.fields.mapHelper', 'Click on the map or drag the marker to set the location.')}
              </div>
              <ZoneMapPicker
                lat={watchedLat || 0}
                lng={watchedLng || 0}
                radius_m={watchedRadius || 100}
                onPositionChange={handleMapPositionChange}
                otherZones={otherZones}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? t('common.save', 'Save') : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
