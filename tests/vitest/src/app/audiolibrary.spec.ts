import { beforeEach, expect, it, vi } from "vitest"
import "../../AudioContextMock/AudioContext.mock"
import { SoundType, type SoundEntity } from "../../../../src/types/common"
import { clearCache, getUserSounds } from "../../../../src/app/audiolibrary"
import { getAuth } from "../../../../src/request"

vi.mock("../../../../src/request", () => ({
    getAuth: vi.fn(),
}))

beforeEach(() => {
    clearCache()
    vi.resetAllMocks()
})

it("defaults an undefined sound type to user without replacing an explicit type", async () => {
    const withoutType = {
        name: "USER_SOUND",
        tempo: -1,
    } as SoundEntity
    const publicSound = {
        name: "PUBLIC_SOUND",
        type: SoundType.Public,
    } as SoundEntity
    vi.mocked(getAuth).mockResolvedValue([withoutType, publicSound])

    const sounds = await getUserSounds("tester")

    expect(sounds[0].type).toBe(SoundType.User)
    expect(sounds[0].tempo).toBeUndefined()
    expect(sounds[1].type).toBe(SoundType.Public)
})
