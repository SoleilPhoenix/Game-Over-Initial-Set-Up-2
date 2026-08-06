/** React Query hooks for the event's separate extra-cost ledger. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  expensesRepository,
  type CreateEventExpense,
  type ExpenseShareInput,
  type ReportEventExpense,
  type UpdateEventExpense,
} from '@/repositories/expenses';
import { localExpenseMigrationRepository } from '@/repositories/localExpenseMigration';
import { useAuthStore } from '@/stores/authStore';

export type {
  CreateEventExpense,
  EventExpense,
  EventExpenseReport,
  EventExpenseShare,
  ExpenseShareInput,
  ReportEventExpense,
  UpdateEventExpense,
} from '@/repositories/expenses';

export type CreateExpenseInput = Omit<CreateEventExpense, 'eventId' | 'createdBy'>;
export type ReportExpenseInput = Omit<ReportEventExpense, 'reportedBy'>;

export const expenseKeys = {
  all: ['expenses'] as const,
  byEvent: (eventId: string) => [...expenseKeys.all, 'event', eventId] as const,
};

function requireUserId(userId: string | undefined): string {
  if (!userId) throw new Error('Authentication required for expense changes');
  return userId;
}

export function useEventExpenses(eventId: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.byEvent(eventId ?? ''),
    queryFn: () => expensesRepository.getByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateExpense(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useMutation({
    mutationFn: (expense: CreateExpenseInput) => expensesRepository.create({
      ...expense,
      eventId: eventId!,
      createdBy: requireUserId(userId),
    }),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
    },
  });
}

export function useUpdateExpense(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateEventExpense }) =>
      expensesRepository.update(id, patch),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
    },
  });
}

export function useDeleteExpense(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesRepository.delete(id),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
    },
  });
}

export function useSetExpenseShares(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expenseId, shares }: { expenseId: string; shares: ExpenseShareInput[] }) =>
      expensesRepository.setShares(expenseId, shares),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
    },
  });
}

export function useMarkOwnExpenseShareSettled(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useMutation({
    mutationFn: (shareId: string) =>
      expensesRepository.markOwnShareSettled(shareId, requireUserId(userId)),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
    },
  });
}

export function useReportExpense(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useMutation({
    mutationFn: (report: ReportExpenseInput) => expensesRepository.reportExpense({
      ...report,
      reportedBy: requireUserId(userId),
    }),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
    },
  });
}

export function useResolveExpenseReport(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useMutation({
    mutationFn: (reportId: string) =>
      expensesRepository.resolveReport(reportId, requireUserId(userId)),
    onSettled: () => {
      if (eventId) queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
    },
  });
}

export function useMigrateLocalExpenses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => localExpenseMigrationRepository.migrateEvent(eventId),
    onSuccess: (result, eventId) => {
      if (result.migratedExpenses > 0) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
      }
    },
  });
}
