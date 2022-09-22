import React, { useState, useRef, useEffect } from "react"
import { Chance } from "chance"
// import * as ace from "ace-builds"
import Sk from "skulpt"

import { ModalContainer } from "./App"
import * as ESUtils from "../esutils"
import { DAWData, Clip, EffectRange } from "common"
import * as runner from "./runner"

// overwrite userConsole javascript prompt with a hijackable one
const nativePrompt = (window as any).esPrompt

// overwrite JavaScript random implementation with seedable one
const randomSeed = (seed?: number) => {
    const rng = new Chance(seed ?? Date.now())
    Math.random = () => {
        return rng.random()
    }
}

// Compile a script as python or javascript based on the extension and return the compilation promise.
export const compile = async (script: string, filename: string, seed?: number) => {
    const ext = ESUtils.parseExt(filename)
    if (ext === ".py") {
        Sk.onAfterImport = (library: string) => {
            if (library === "random") {
                // Use the given seed for Skulpt
                const seedfunc = Sk.sysmodules.entries.random[1].$d.seed
                // Seed Skulpt's RNG implementation
                Sk.misceval.callsim(seedfunc, seed ?? Date.now())
            }
        }
        return runner.run("python", script)
    } else if (ext === ".js") {
        randomSeed(seed)
        return runner.run("javascript", script)
    } else {
        throw new Error("Invalid file extension " + ext)
    }
}

// Read a File object and return a promise that will resolve to the file text contents.
export const readFile = (file: File) => {
    const p = new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = (evt) => {
            if (evt.target) {
                const result = evt.target.result
                resolve(result as string)
            }
        }
        r.onerror = (err) => {
            reject(err)
        }
        r.readAsText(file)
    })
    return p
}

// Sort the clips in an object by measure.
const sortClips = (result: DAWData) => {
    for (const track of Object.values(result.tracks)) {
        track.clips.sort((a: Clip, b: Clip) => a.measure - b.measure)
    }
}

// Sort effects by start measure.
const sortEffects = (result: DAWData) => {
    for (const track of Object.values(result.tracks)) {
        for (const effect of Object.values(track.effects)) {
            effect.sort((a: EffectRange, b: EffectRange) => a.startMeasure - b.startMeasure)
        }
    }
}

// grep function copied from jquery source. It was the only remaining use of jquery.
function grep(elems: any[], callback: (elementOfArray: object, indexInArray: number) => boolean, invert = false) {
    let callbackInverse
    const matches = []
    let i = 0
    const length = elems.length
    const callbackExpect = !invert

    // Go through the array, only saving the items
    // that pass the validator function
    for (; i < length; i++) {
        callbackInverse = !callback(elems[i], i)
        if (callbackInverse !== callbackExpect) {
            matches.push(elems[i])
        }
    }

    return matches
}

// Function to compare the similarity of two script results.
const compare = (reference: DAWData, test: DAWData, testAllTracks: boolean, testTracks: boolean[]) => {
    // create copies for destructive comparison
    reference = JSON.parse(JSON.stringify(reference))
    test = JSON.parse(JSON.stringify(test))
    // sort clips so clips inserted in different orders will not affect equality.
    sortClips(reference)
    sortClips(test)
    // do the same with effects
    sortEffects(reference)
    sortEffects(test)
    // remove tracks we're not testing
    if (!testAllTracks) {
        reference.tracks = grep(reference.tracks, (n: any, i: number) => testTracks[i])
        test.tracks = grep(test.tracks, (n: any, i: number) => testTracks[i])
    }
    return JSON.stringify(reference) === JSON.stringify(test)
}

interface Upload {
    file: File
    script: string
    compiled: boolean
    result?: DAWData
    error?: string
    pass?: boolean
}

// Compile a test script and compare it to the reference script.
// Returns a promise that resolves to an object describing the test results.
const compileAndCompare = (referenceResult: DAWData, file: File, testScript: string, testAllTracks: boolean, testTracks: boolean[], seed?: number) => {
    const results: Upload = {
        file,
        script: testScript,
        compiled: false,
        error: "",
        pass: false,
    }
    return compile(testScript, file.name, seed).then((result: DAWData) => {
        results.result = result
        results.compiled = true
        // check against reference script
        const a = compare(referenceResult, result, testAllTracks, testTracks)
        if (a) {
            results.pass = true
        }
        return results
    }).catch(err => {
        results.error = err.toString()
        results.compiled = true
        return results
    })
}

const CodeEmbed = ({ sourceCode, language: _ }: { sourceCode: string, language: string }) => {
    const editorContainer = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // TODO: Don't use Ace.
        // if (!editorContainer.current) return
        // const editor = ace.edit(editorContainer.current)
        // editor.setOptions({
        //     mode: "ace/mode/" + language,
        //     theme: "ace/theme/chrome",
        //     showPrintMargin: false,
        //     wrap: true,
        //     readOnly: true,
        // })
    }, [])

    return <div ref={editorContainer} style={{ height: "300px" }}>{sourceCode}</div>
}

interface ReferenceScript {
    name: string
    sourceCode: string
}

const ReferenceFile = ({ referenceScript, compilingReference }: {
    referenceScript: ReferenceScript, compilingReference: boolean
}) => {
    const [collapse, setCollapse] = useState(true)

    return <div className="container">
        <div className="panel panel-default">
            <div className="panel-heading">
                {compilingReference &&
                    <i className="es-spinner animate-spin mr-3"></i>}
                {referenceScript.name}
                {collapse
                    ? <a className="pull-right" onClick={() => setCollapse(false)}>Expand</a>
                    : <a className="pull-right" onClick={() => setCollapse(true)}>Collapse</a>}
            </div>
            <div style={{ display: collapse ? "none" : "block" }}>
                <CodeEmbed sourceCode={referenceScript.sourceCode} language={ESUtils.parseLanguage(referenceScript.name)} />
            </div>
        </div>
    </div>
}

const ReferenceScriptUpload = ({ compileError, prompts, seed, setReferenceResult, setCompileError, setTestAllTracks, setTestTracks, setUploads, setFiles, setPrompts }: {
    compileError: string
    prompts: string[]
    seed?: number
    setReferenceResult: (r: DAWData | null) => void
    setCompileError: (e: string) => void
    setTestAllTracks: (t: boolean) => void
    setTestTracks: (t: boolean[]) => void
    setUploads: (u: Upload[]) => void
    setFiles: (f: File[]) => void, setPrompts: (p: string[]) => void
}) => {
    const [referenceScript, setReferenceScript] = useState({ name: "", sourceCode: "" } as ReferenceScript)
    const [compilingReference, setCompilingReference] = useState(false)

    const updateReferenceFile = async (file: File) => {
        // use the hijacked prompt function to input user input
        (window as any).esPrompt = (text: string) => {
            return nativePrompt(text).then((response: string) => {
                setPrompts([...prompts, response])
                return response
            })
        }

        setCompileError("")
        setReferenceScript({ sourceCode: "", name: "" })
        setReferenceResult(null)
        setUploads([])
        setFiles([])
        setPrompts([])

        if (file) {
            let script
            try {
                script = await readFile(file)
            } catch (err) {
                console.error(err)
                setCompilingReference(false)
                setCompileError(err.toString())
                return
            }
            setReferenceScript({ sourceCode: script, name: file.name } as ReferenceScript)
            setCompilingReference(true)
            let result
            try {
                result = await compile(script, file.name, seed)
                setTestAllTracks(true)
                setTestTracks(new Array(result.tracks.length).fill(false))
                setCompilingReference(false)
                setReferenceResult(result)
            } catch (err) {
                console.error(err)
                setCompilingReference(false)
                setCompileError(err.toString())
            }
        }
    }

    return <div>
        <div className="container">
            <h1>EarSketch Autograder</h1>
            {compileError &&
                <div className="alert alert-danger" role="alert">{compileError}</div>}
            <div className="panel panel-primary">
                <div className="panel-heading">
                    Step 1: Upload a Reference Script
                </div>
                <input type="file" onChange={file => {
                    if (file.target.files) { updateReferenceFile(file.target.files[0]) }
                }}></input>
            </div>
        </div>
        {referenceScript!.name.length > 0 &&
            <ReferenceFile referenceScript={referenceScript} compilingReference={compilingReference} />}
    </div>
}

const ConfigureTest = ({
    referenceResult, compileError, testAllTracks, testTracks, allowPrompts, prompts, seed,
    setTestAllTracks, setTestTracks, setAllowPrompts, setSeed,
}: {
    referenceResult: DAWData | null, compileError: string, testAllTracks: boolean, testTracks: boolean[], allowPrompts: boolean, prompts: string[], seed?: number,
    setTestAllTracks: (t: boolean) => void, setTestTracks: (t: boolean[]) => void, setAllowPrompts: (a: boolean) => void, setSeed: (s?: number) => void
}) => {
    return <div className="container">
        <div className="panel panel-primary">
            <div className="panel-heading">
                Step 2: Configure Test
            </div>
            <div className="panel-body">
                <div className="row">
                    <div className="col-md-4">
                        <h4>Tracks to Compare</h4>
                        {referenceResult && !compileError
                            ? <div>
                                <label>
                                    <input type="checkbox" checked={testAllTracks} onChange={e => setTestAllTracks(e.target.checked)}></input>
                                    Test all tracks.
                                </label>
                            </div>
                            : <div> Available after uploading a reference script. </div>}
                        <br></br>
                        <ul>
                            {referenceResult && !compileError && !testAllTracks &&
                                Object.keys(referenceResult.tracks).map((_, index) =>
                                    <li key={index}>
                                        <label>
                                            <input type="checkbox" onChange={e => setTestTracks({ ...testTracks, [index]: e.target.checked })}></input>
                                            {index === 0
                                                ? <span>Main</span>
                                                : <span>Track {index}</span>}
                                        </label>
                                    </li>
                                )}
                        </ul>
                    </div>
                    <div className="col-md-4">
                        <h4>Input Prompts</h4>
                        {(referenceResult && compileError.length === 0)
                            ? prompts.length > 0
                                ? <div>
                                    <label>
                                        <input type="checkbox" checked={!allowPrompts} onChange={e => setAllowPrompts(!e.target.checked)}></input>
                                        Automatically use these prompts when needed in test scripts:
                                    </label>
                                    <ol>
                                        {prompts.map((prompt, index) =>
                                            <li key={index}><b>{prompt}</b></li>
                                        )}
                                    </ol>
                                </div>
                                : <div> No user input detected. </div>
                            : <div> Available after uploading a reference script. </div>}
                    </div>
                    <div className="col-md-4">
                        <h4>Random Seed</h4>
                        <input type="checkbox" checked={seed !== undefined} onChange={e => setSeed(e.target.checked ? Date.now() : undefined)}></input>
                        {seed !== undefined
                            ? <div>Use the following random seed:
                                <input type="text" value={seed} onChange={e => setSeed(Number(e.target.value))}></input>
                            </div>
                            : <div>Use a random seed</div>}
                        <p className="small">
                            This will automatically seed every random function in Python and JavaScript.
                        </p>
                        <p className="small">
                            Disclaimer: Testing randomness is inherently difficult. Only use this in the most trivial of cases.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

const TestResult = ({ upload, index }: { upload: Upload, index: number }) => {
    const [showCode, setShowCode] = useState(false)

    return <div className="panel panel-default">
        <div className="panel-heading">
            {!upload.compiled &&
                <i className="es-spinner animate-spin mr-3"></i>}
            <b> {index + 1} </b> {upload.file.name}
            {upload.file.name.length > 50 &&
                <span>...</span>}
            {upload.compiled &&
                !upload.error
                ? upload.pass
                    ? <span className="label label-success" style={{ margin: "1%" }}>
                        Perfect match!
                    </span>
                    : <span className="label label-warning" style={{ margin: "1%" }}>
                        Does not match.
                    </span>
                : <span className="label label-danger" style={{ margin: "1%" }}>
                    {upload.error}
                </span>}
            {showCode
                ? <a className="pull-right" onClick={() => setShowCode(false)}>Collapse</a>
                : <a className="pull-right" onClick={() => setShowCode(true)}>Expand</a>}
        </div>
        <div>
            {upload.compiled && showCode &&
                <CodeEmbed sourceCode={upload.script} language={ESUtils.parseLanguage(upload.file.name)} />}
        </div>
    </div>
}

const TestResults = ({ uploads, files, referenceResult, testAllTracks, testTracks, allowPrompts, prompts, seed, setUploads, setFiles }: {
    uploads: Upload[], files: File[], referenceResult: DAWData, testAllTracks: boolean, testTracks: boolean[], allowPrompts: boolean,
    prompts: string[], seed?: number, setUploads: (u: Upload[]) => void, setFiles: (f: File[]) => void
}) => {
    const updateFiles = async (files: File[]) => {
        // use the hijacked prompt function to input user input
        (window as any).esPrompt = async (text: string) => {
            let i = 0
            if (allowPrompts) {
                return nativePrompt(text)
            } else {
                return prompts[i++ % prompts.length]
            }
        }

        setFiles(files)
        setUploads([])

        const results: Upload[] = []
        for (const file of files) {
            let script
            try {
                script = await readFile(file)
            } catch {
                const result = {
                    file,
                    script: "",
                    compiled: false,
                    error: "Read error, corrupted file?",
                    pass: false,
                }
                results.push(result)
                setUploads(results)
                continue
            }
            setUploads([...results, { file, script, compiled: false }])
            const result = await compileAndCompare(referenceResult, file, script, testAllTracks, testTracks, seed)
            results.push(result)
            setUploads(results)
        }
    }

    return <div>
        <div className="container">
            <div className="panel panel-primary">
                <div className="panel-heading">
                    Step 3: Upload Test Scripts
                </div>
                <div className="panel-body">
                    Drop scripts here or click to upload.
                    <input type="file" multiple onChange={(file) => {
                        if (file.target.files) { updateFiles(Object.values(file.target.files)) }
                    }} />
                </div>
            </div>
        </div>
        <div className="container">
            <ul>
                {uploads.map((upload, index) =>
                    <li key={index}>
                        <TestResult upload={upload} index={index} />
                    </li>
                )}
            </ul>
        </div>
        {uploads.length > 0 &&
            <div className="container">
                {uploads.length === files.length
                    ? <div className="alert alert-success">
                        All scripts tested.
                    </div>
                    : <div className="alert alert-info">
                        Testing script {uploads.length} / {files.length}
                    </div>}
            </div>}
    </div>
}

export const Autograder = () => {
    document.getElementById("loading-screen")!.style.display = "none"

    const [compileError, setCompileError] = useState("")
    const [referenceResult, setReferenceResult] = useState(null as DAWData | null)
    const [testAllTracks, setTestAllTracks] = useState(true)
    const [testTracks, setTestTracks] = useState([] as boolean[])
    const [allowPrompts, setAllowPrompts] = useState(false)
    const [prompts, setPrompts] = useState([] as string[])
    const [seed, setSeed] = useState(Date.now() as number | undefined)
    const [uploads, setUploads] = useState([] as Upload[])
    const [files, setFiles] = useState([] as File[])

    return <div>
        <ReferenceScriptUpload
            compileError={compileError}
            prompts={prompts}
            seed={seed}
            setReferenceResult={setReferenceResult}
            setCompileError={setCompileError}
            setTestAllTracks={setTestAllTracks}
            setTestTracks={setTestTracks}
            setUploads={setUploads}
            setFiles={setFiles}
            setPrompts={setPrompts}
        />
        <ConfigureTest
            referenceResult={referenceResult}
            compileError={compileError}
            testAllTracks={testAllTracks}
            testTracks={testTracks}
            allowPrompts={allowPrompts}
            prompts={prompts}
            seed={seed}
            setTestAllTracks={setTestAllTracks}
            setTestTracks={setTestTracks}
            setAllowPrompts={setAllowPrompts}
            setSeed={setSeed}
        />
        {referenceResult && !compileError &&
            <TestResults
                uploads={uploads}
                files={files}
                referenceResult={referenceResult}
                testAllTracks={testAllTracks}
                testTracks={testTracks}
                allowPrompts={allowPrompts}
                prompts={prompts}
                seed={seed}
                setUploads={setUploads}
                setFiles={setFiles}
            />}
        <ModalContainer />
    </div>
}
