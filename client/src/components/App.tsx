import { Route, Switch } from "wouter";
import { Layout } from "~/src/components/Layout";

import { QueryClientProvider } from "~/src/components/QueryClientProvider";
import Home from "~/src/routes/Home";
import NotFound from "~/src/routes/NotFound";
import SignIn from "~/src/routes/SignIn";
import SignUp from "~/src/routes/SignUp";

export function App() {
  return (
    <QueryClientProvider>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/sign-up" component={SignUp} />
          <Route path="/sign-in" component={SignIn} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </QueryClientProvider>
  );
}
