import { jest } from "@jest/globals";
import { render } from "@testing-library/react-native";

import Colors from "@/constants/Colors";
import { Text, useThemeColor } from "../Themed";
import { useColorScheme } from "../useColorScheme";

jest.mock("../useColorScheme", () => ({
  useColorScheme: jest.fn(),
}));

const mockUseColorScheme = useColorScheme as jest.MockedFunction<
  typeof useColorScheme
>;

describe("Themed helpers", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("falls back to dark palette when overrides are missing", () => {
    mockUseColorScheme.mockReturnValue("dark");

    const color = useThemeColor({}, "text");

    expect(color).toBe(Colors.dark.text);
  });

  it("applies the computed color to Text components", () => {
    mockUseColorScheme.mockReturnValue("light");

    const { getByText } = render(<Text>Hello!</Text>);

    const rendered = getByText("Hello!");
    const [style] = Array.isArray(rendered.props.style)
      ? rendered.props.style
      : [rendered.props.style];

    expect(style).toMatchObject({ color: Colors.light.text });
  });
});
