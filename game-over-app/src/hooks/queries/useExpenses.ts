/** React Query hooks for the event's separate extra-cost ledger. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  expensesRepository,
  type CreateEventExpense,
  type CreateEventExpenseCategory,
  type ExpenseShareInput,
  type ReportEventExpense,
  type UpdateEventExpense,
} from '@/repositories/expenses';
import { localExpenseMigrationRepository } from '@/repositories/localExpenseMigration';
import { useAuthStore } from '@/stores/authStore';

export type {
  CreateEventExpense,
  CreateEventExpenseCategory,
  EventExpense,
  EventExpenseCategory,
  EventExpenseReport,
  EventExpenseShare,
  ExpenseShareInput,
  ReportEventExpense,
  UpdateEventExpense,
} from '@/repositories/expenses';

export type CreateExpenseInput = Omit<CreateEventExpense, 'eventId' | 'createdBy'>;
export type CreateExpenseCategoryInput = Omit<
  CreateEventExpenseCategory,
  'eventId' | 'createdBy'
>;
export type ReportExpenseInput = Omit<ReportEventExpense, 'reportedBy'>;

export const expenseKeys = {
  all: ['expenses'] as const,
  byEvent: (eventId: string) => [...expenseKeys.all, 'event', eventId] as const,
  categoriesByEvent: (eventId: string) => [
    ...expenseKeys.all,
    'categories',
    eventId,
  ] as const,
  reportsByEvent: (eventId: string) => [
    ...expenseKeys.all,
    'reports',
    eventId,
  ] as const,
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
    mutationFn: ({
      expenseId,
      amountCents,
      shares,
    }: {
      expenseId: string;
      amountCents: number;
      shares: ExpenseShareInput[];
    }) => expensesRepository
      .setShares(expenseId, amountCents, shares)
      .then(async (savedShares) => {
        try {
          await expensesRepository.notifyShares(expenseId);
        } catch (error) {
          console.error('[expenses] share push failed:', error);
        }
        return savedShares;
      }),
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
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
        queryClient.invalidateQueries({ queryKey: expenseKeys.reportsByEvent(eventId) });
      }
    },
  });
}

export function useEventExpenseReports(eventId: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.reportsByEvent(eventId ?? ''),
    queryFn: () => expensesRepository.getOpenReportsByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useResolveExpenseReport(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useMutation({
    mutationFn: (reportId: string) =>
      expensesRepository.resolveReport(reportId, requireUserId(userId)),
    onSettled: () => {
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.byEvent(eventId) });
        queryClient.invalidateQueries({ queryKey: expenseKeys.reportsByEvent(eventId) });
      }
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
      if (result.migratedCategories > 0) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.categoriesByEvent(eventId) });
      }
    },
  });
}

export function useEventExpenseCategories(eventId: string | undefined) {
  return useQuery({
    queryKey: expenseKeys.categoriesByEvent(eventId ?? ''),
    queryFn: () => expensesRepository.getCategoriesByEventId(eventId!),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateExpenseCategory(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const userId = useAuthStore(state => state.user?.id);

  return useMutation({
    mutationFn: (category: CreateExpenseCategoryInput) => expensesRepository.createCategory({
      ...category,
      eventId: eventId!,
      createdBy: requireUserId(userId),
    }),
    onSettled: () => {
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.categoriesByEvent(eventId) });
      }
    },
  });
}

export function useRenameExpenseCategory(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, label }: { id: string; label: string }) =>
      expensesRepository.renameCategory(id, label),
    onSettled: () => {
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.categoriesByEvent(eventId) });
      }
    },
  });
}

export function useDeleteExpenseCategory(eventId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesRepository.deleteCategory(id),
    onSettled: () => {
      if (eventId) {
        queryClient.invalidateQueries({ queryKey: expenseKeys.categoriesByEvent(eventId) });
      }
    },
  });
}
