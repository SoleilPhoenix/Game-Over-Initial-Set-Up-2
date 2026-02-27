/**
 * Budget screen within the event stack.
 * Accessed via /event/[id]/budget — useLocalSearchParams returns { id: eventId }
 * so router.back() correctly returns to Event Summary (/event/[id]).
 */
export { default } from '../../(tabs)/budget/index';
