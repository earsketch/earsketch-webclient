import React from "react"
import { ModalFooter } from "../Utils"

export const CompetitionSubmission = ({ name, shareID, close }: { name: string, shareID: string, close: () => void }) => {
    return <div className="share-script">
        <div className="modal-header">
            <h4 className="modal-title">
                <i className="icon icon-share2 mr-3" />
                Submit &quot;{name}&quot; to Competition
            </h4>
        </div>
        <div className="modal-body">
            <div className="share-script-menu-descriptions text-3xl">
                Enter your script to the <a href="https://www.amazonfutureengineer.com/yourvoiceispower" target="_blank" rel="noreferrer"> Competition.</a>
            </div>
            <div>
                <div className="panel form-group text-3xl text-center">
                    <div className="modal-section-header w-full m-0">
                        <span>Competition Rules</span>
                    </div>
                    <ul className="list-disc text-left p-10 pl-16">
                        <li>Submission deadline for Round 1 is 11:59PM EST on March 12, 2021.</li>
                        <li>Submission deadline for Round 2 is 11:59PM EST on June 4, 2021.</li>
                        <li>Students may work individually or in pairs.</li>
                        <li>Students may submit multiple entries, but a winning submission from Round 1 may not be submitted for Round 2.</li>
                        <li>Open to middle and high school students in the US and Canada.</li>
                        <li>Must include at least one musical stem from Pharrell &amp; Jay-Z&apos;s &quot;Entrepreneur.&quot;</li>
                        <li>Must be 30 seconds to 3 minutes in length.</li>
                        <li>Code must run without errors.</li>
                        <li>For more information, please visit the <a href="https://www.amazonfutureengineer.com/yourvoiceispower" target="_blank" rel="noreferrer">competition website</a>.</li>
                    </ul>
                </div>
                <div className="text-center m-auto">
                    <a href={"https://rocketjudge.com/register/poRnymQW#scriptid=".concat(shareID)} target="_blank" rel="noreferrer">
                        <button style={{ minWidth: "270px", fontSize: "26px", color: "black", background: "#d3d25a" }}>Click Here to Submit</button>
                    </a>
                </div>
            </div>
        </div>

        <ModalFooter close={close} />
    </div>
}
