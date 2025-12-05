import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

import { SignIn } from "@/components/SignIn/SignIn";

describe("SignIn", () => {
  it("renders the welcome heading", () => {
    const action = jest.fn(async () => ({ error: null }));

    render(
      <MantineProvider>
        <SignIn action={action} />
      </MantineProvider>
    );

    expect(
      screen.getByRole("heading", { name: /welcome back!/i })
    ).toBeInTheDocument();
  });
});
