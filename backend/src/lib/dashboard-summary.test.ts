import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateDashboardSummaryTextMock } = vi.hoisted(() => ({
  generateDashboardSummaryTextMock: vi.fn()
}));

vi.mock("../ai/ai-client.js", () => ({
  generateDashboardSummaryText: generateDashboardSummaryTextMock
}));

import { generateDashboardSummary } from "./dashboard-summary.js";

describe("generateDashboardSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes normalized weather bucket and average temperature to AI", async () => {
    generateDashboardSummaryTextMock.mockResolvedValue(
      "Today is cloudy and you have 2 appointments."
    );

    const result = await generateDashboardSummary({
      weather: {
        location: "Amsterdam",
        current: {
          temperatureC: 24,
          condition: "Cloudy",
          rainChancePct: 10
        },
        forecast: [
          {
            temperatureC: 20,
            condition: "Overcast",
            rainChancePct: 20
          },
          {
            temperatureC: 22,
            condition: "Clouds",
            rainChancePct: 15
          }
        ]
      },
      appointmentCount: 2,
      language: "en"
    });

    expect(result.summary).toBe("Today is cloudy and you have 2 appointments.");
    expect(generateDashboardSummaryTextMock).toHaveBeenCalledWith({
      language: "en",
      bucket: "cloudy",
      averageTemperatureC: 22,
      appointmentCount: 2
    });
  });

  it("normalizes chinese language requests", async () => {
    generateDashboardSummaryTextMock.mockResolvedValue("今天天气晴朗，今天您有1个约会。");

    await generateDashboardSummary({
      weather: {
        location: "Amsterdam",
        current: {
          temperatureC: 26,
          condition: "Sunny",
          rainChancePct: 0
        },
        forecast: []
      },
      appointmentCount: 1,
      language: "zh-CN"
    });

    expect(generateDashboardSummaryTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "zh",
        bucket: "sunny"
      })
    );
  });

  it("cleans fenced and quoted AI output", async () => {
    generateDashboardSummaryTextMock.mockResolvedValue(
      '```text\n"Today is rainy and you have 3 appointments."\n```'
    );

    const result = await generateDashboardSummary({
      weather: {
        location: "Amsterdam",
        current: {
          temperatureC: 18,
          condition: "Rain",
          rainChancePct: 80
        },
        forecast: []
      },
      appointmentCount: 3,
      language: "en"
    });

    expect(result.summary).toBe("Today is rainy and you have 3 appointments.");
  });

  it("throws when AI returns empty content", async () => {
    generateDashboardSummaryTextMock.mockResolvedValue("");

    await expect(
      generateDashboardSummary({
        weather: {
          location: "Amsterdam",
          current: {
            temperatureC: 18,
            condition: "Rain",
            rainChancePct: 80
          },
          forecast: []
        },
        appointmentCount: 3,
        language: "en"
      })
    ).rejects.toThrow("AI summary response was empty");
  });
});
