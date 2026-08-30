import { QueryClient, defaultShouldDehydrateQuery, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 phút cache trước khi background refetch
        gcTime: 5 * 60 * 1000, // 5 phút garbage collection
        refetchOnWindowFocus: false,
        retry: 1,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    // Server: Luôn tạo QueryClient mới cho mỗi request để tránh rò rỉ dữ liệu giữa người dùng
    return makeQueryClient();
  } else {
    // Trình duyệt: Dùng chung một QueryClient singleton
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
