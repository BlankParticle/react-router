import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import {
  Outlet,
  RouterProvider,
  createMemoryRouter,
  useLoaderData,
  useNavigation,
} from "react-router";

import { useNavigate, useSubmit } from "../index";
import { createDeferred } from "./router/utils/utils";

describe("react transitions", () => {
  it("useNavigate works inside a startTransition", async () => {
    let loaderDfd = createDeferred();
    let router = createMemoryRouter([
      {
        path: "/",
        Component() {
          let navigation = useNavigation();
          return (
            <>
              <p>{`Navigation:${navigation.state}`}</p>
              <Outlet />
            </>
          );
        },
        children: [
          {
            index: true,
            Component() {
              let navigate = useNavigate();
              let onClick = () => {
                // @ts-expect-error - Allowed in React 19 but we develop against
                // the React 18 types
                React.startTransition(() => {
                  return navigate("/page");
                });
              };
              return <button onClick={onClick}>Go to page</button>;
            },
          },
          {
            path: "page",
            loader: () => loaderDfd.promise,
            Component() {
              return <h1>{useLoaderData()}</h1>;
            },
          },
        ],
      },
    ]);

    let { container } = render(
      <RouterProvider router={router} unstable_transitions={true} />,
    );

    await waitFor(() => screen.getByText("Go to page"), { timeout: 1000 });
    expect(screen.getByText("Navigation:idle")).toBeDefined();

    await fireEvent.click(container.querySelector("button")!);
    await waitFor(() => screen.getByText("Navigation:loading"), {
      timeout: 1000,
    });

    loaderDfd.resolve("Page");
    await waitFor(() => screen.getByText("Page"), { timeout: 1000 });
    expect(screen.getByText("Navigation:idle")).toBeDefined();
  });

  it("useSubmit works inside a startTransition", async () => {
    let actionDfd = createDeferred();
    let loaderDfd = createDeferred();
    let router = createMemoryRouter([
      {
        path: "/",
        Component() {
          let navigation = useNavigation();
          return (
            <>
              <p>{`Navigation:${navigation.state}`}</p>
              <Outlet />
            </>
          );
        },
        children: [
          {
            index: true,
            Component() {
              let submit = useSubmit();
              let onClick = () => {
                // @ts-expect-error - Allowed in React 19 but we develop against
                // the React 18 types
                React.startTransition(() => {
                  return submit({}, { method: "post", action: "/page" });
                });
              };
              return <button onClick={onClick}>Submit</button>;
            },
          },
          {
            path: "page",
            action: () => actionDfd.promise,
            loader: () => loaderDfd.promise,
            Component() {
              return <h1>{useLoaderData()}</h1>;
            },
          },
        ],
      },
    ]);

    let { container } = render(
      <RouterProvider router={router} unstable_transitions={true} />,
    );

    await waitFor(() => screen.getByText("Submit"), { timeout: 1000 });
    expect(screen.getByText("Navigation:idle")).toBeDefined();

    await fireEvent.click(container.querySelector("button")!);
    await waitFor(() => screen.getByText("Navigation:submitting"), {
      timeout: 1000,
    });

    actionDfd.resolve("ACTION");
    await waitFor(() => screen.getByText("Navigation:loading"), {
      timeout: 1000,
    });

    loaderDfd.resolve("Page");
    await waitFor(() => screen.getByText("Page"), { timeout: 1000 });
    expect(screen.getByText("Navigation:idle")).toBeDefined();
  });
});
