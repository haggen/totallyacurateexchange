import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { useLocation } from "wouter";

type Props = {
	children: ReactNode;
};

function Provider({ children }: Props) {
	const [, setLocation] = useLocation();

	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						retry(count, error) {
							return false;
						},
					},
				},
				queryCache: new QueryCache({
					onError(error) {
						if ("status" in error && error.status === 401) {
							setLocation("/sign-in");
						}
					},
				}),
			}),
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

export { Provider as QueryClientProvider };
