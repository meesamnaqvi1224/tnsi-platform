export const VERSION = '0.0.0';

// lib
export { cn } from './lib/cn';

// primitives
export { Button, buttonVariants, type ButtonProps } from './primitives/button';
export { IconButton, type IconButtonProps } from './primitives/icon-button';
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './primitives/card';
export { Badge, badgeVariants, type BadgeProps } from './primitives/badge';
export { Avatar, type AvatarProps } from './primitives/avatar';
export { Container, type ContainerProps } from './primitives/container';
export { Stack, type StackProps } from './primitives/stack';
export { Grid, type GridProps } from './primitives/grid';
export { Section, type SectionProps } from './primitives/section';
export { Divider, type DividerProps } from './primitives/divider';
export { Eyebrow, type EyebrowProps } from './primitives/eyebrow';
export { Heading, type HeadingProps } from './primitives/heading';
export { Text, type TextProps } from './primitives/text';
export { Link, type LinkProps } from './primitives/link';

// forms
export { Input, type InputProps } from './forms/input';
export { Textarea, type TextareaProps } from './forms/textarea';
export { Label, type LabelProps } from './forms/label';
export { ValidationMessage, type ValidationMessageProps } from './forms/validation-message';
export { Form, FormField, type FormFieldProps } from './forms/form';
export { Checkbox, type CheckboxProps } from './forms/checkbox';
export { RadioGroup, RadioItem, type RadioGroupProps, type RadioItemProps } from './forms/radio';
export { Switch, type SwitchProps } from './forms/switch';
export {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type SelectTriggerProps,
  type SelectContentProps,
  type SelectItemProps,
} from './forms/select';

// feedback
export { Alert, type AlertProps } from './feedback/alert';
export { Spinner, type SpinnerProps } from './feedback/spinner';
export { Skeleton } from './feedback/skeleton';
export { Progress, type ProgressProps } from './feedback/progress';
export { EmptyState, type EmptyStateProps } from './feedback/empty-state';
export { ToastProvider, toastManager, useToast } from './feedback/toast';

// overlay
export {
  ModalRoot,
  ModalTrigger,
  ModalClose,
  ModalContent,
  type ModalContentProps,
} from './overlay/modal';
export {
  DrawerRoot,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  type DrawerContentProps,
} from './overlay/drawer';
export {
  DropdownRoot,
  DropdownTrigger,
  DropdownGroup,
  DropdownGroupLabel,
  DropdownContent,
  DropdownItem,
  DropdownCheckboxItem,
  DropdownSeparator,
  type DropdownContentProps,
  type DropdownItemProps,
  type DropdownCheckboxItemProps,
} from './overlay/dropdown';
export {
  PopoverRoot,
  PopoverTrigger,
  PopoverClose,
  PopoverContent,
  type PopoverContentProps,
} from './overlay/popover';
export {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  type TooltipContentProps,
} from './overlay/tooltip';

// editorial
export { ChapterMarker, type ChapterMarkerProps } from './editorial/chapter-marker';
export {
  CapacityJourney,
  CAPACITY_STAGES,
  type CapacityJourneyProps,
  type CapacityStage,
} from './editorial/capacity-journey';
export { TypographicMoment, type TypographicMomentProps } from './editorial/typographic-moment';
export { PageQuote, type PageQuoteProps } from './editorial/page-quote';
export {
  InstitutionalEvidence,
  type InstitutionalEvidenceProps,
  type EvidenceItem,
} from './editorial/institutional-evidence';
export { EditorialFigure, type EditorialFigureProps } from './editorial/editorial-figure';
