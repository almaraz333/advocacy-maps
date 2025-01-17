import React, { useState, useLocation, useEffect } from "react"
import { Button, Modal } from "react-bootstrap"
import { useAuth } from "../../components/auth"
import { useProfile, useMember } from "../db"
import { useEditTestimony } from "../db/testimony/useEditTestimony"
import TweetComponent from "./TweetComponent"
import EmailToCommitteeComponent from "./EmailToCommitteeComponent"
import EmailToMyLegislatorsComponent from "./EmailToMyLegislatorsComponent"
import createMyLegislatorEmailCommand from "./createMyLegislatorEmailCommand"
import createCommitteeChairEmailCommand from "./createCommitteeChairEmailCommand"
import { siteUrl } from "../links"

const testimonyArchiveEmailAddress = "test@example.com" // in order to have emails send to legislators via BCC, we need a primary "send to" email address for each email.  This is a placeholder email address.  Ultimately, this should be in a configuration file.

const CommentModal = ({
  bill,
  committeeName,
  houseChairEmail,
  senateChairEmail,
  showTestimony,
  handleCloseTestimony
}) => {
  const webSiteBillAddress = siteUrl(`bill?id=${bill.BillNumber}`)
  const [checkedSendToYourLegislators, setCheckedSendToYourLegislators] =
    React.useState(true)
  const [checkedSendToCommittee, setCheckedSendToCommittee] =
    React.useState(committeeName) // only default checkbox to checked if the bill is in a committee

  const [checkedTweet, setCheckedTweet] = React.useState(true)

  const testimonyExplanation = (
    <div>
      <h5> Guidance on providing testimony</h5>
      In general, provide:
      <ul>
        <li>Your background</li>
        <li>Why this bill is important to you</li>
        <li>Your thoughts on the bill</li>
      </ul>
    </div>
  )
  const defaultTestimony = "Enter text.."

  const [testimony, setTestimony] = useState(null)

  const [isPublishing, setIsPublishing] = useState(false)

  const { user, authenticated } = useAuth()
  const { profile } = useProfile()

  const senator = useMember(profile?.senator?.id)
  const representative = useMember(profile?.representative?.id)
  const senatorEmail = senator.member?.EmailAddress ?? ""
  const representativeEmail = representative.member?.EmailAddress ?? ""

  const edit = useEditTestimony(user ? user.uid : null, bill.BillNumber)

  useEffect(() => {
    const testimony = edit.draft ? edit.draft : {}
    setTestimony(testimony)
  }, [edit.draft])

  const positionMessage = "Select my support..(required)"

  const positionEmailSubject =
    testimony?.position == "endorse"
      ? "Support of"
      : testimony?.position == "oppose"
      ? "Opposition to"
      : "Opinion on"

  const positionWord =
    testimony?.position == "endorse"
      ? "support"
      : testimony?.position == "oppose"
      ? "oppose"
      : "have thoughts on"

  const emailSuffix = `See more testimony on this bill at ${webSiteBillAddress}`

  const billNumber = bill?.BillNumber
  const billTitle = bill?.Title
  const testimonyContent = testimony?.content

  const emailCommandToMyLegislators = createMyLegislatorEmailCommand(
    representativeEmail,
    senatorEmail,
    positionWord,
    positionEmailSubject,
    billNumber,
    billTitle,
    testimonyContent,
    emailSuffix,
    testimonyArchiveEmailAddress
  )

  const emailCommandToCommitteeChairs = createCommitteeChairEmailCommand(
    houseChairEmail,
    senateChairEmail,
    committeeName,
    positionWord,
    positionEmailSubject,
    billNumber,
    billTitle,
    testimonyContent,
    emailSuffix,
    testimonyArchiveEmailAddress
  )

  const defaultPosition =
    testimony && testimony.position ? testimony.position : undefined
  const defaultContent =
    testimony && testimony.content ? testimony.content : defaultTestimony

  const tweet = encodeURI(
    `https://twitter.com/intent/tweet?text=I provided testimony on bill ${bill.BillNumber}: ${bill.Title}.
    
See ${webSiteBillAddress} for details.`
  )

  const publishTestimony = async () => {
    if (
      testimony.position == undefined ||
      testimony.position == positionMessage ||
      !testimony.content
    ) {
      return
    }
    setIsPublishing(true)
    await edit.saveDraft.execute(testimony)
    await edit.publishTestimony.execute()

    if (checkedSendToYourLegislators) {
      window.open(emailCommandToMyLegislators) // allow user to send a formatted email using their email client
    }
    if (checkedSendToCommittee && (houseChairEmail || senateChairEmail)) {
      window.open(emailCommandToCommitteeChairs) // allow user to send a formatted email using their email client
    }
    if (checkedTweet) {
      window.open(tweet)
    }

    handleCloseTestimony()
    setIsPublishing(false)
  }

  const existingTestimony = !_.isEmpty(testimony)
  const positionChosen =
    testimony?.position != undefined && testimony.position != positionMessage
  const testimonyWritten = testimony?.content != undefined

  return (
    <Modal show={showTestimony} onHide={handleCloseTestimony} size="lg">
      <Modal.Header closeButton onClick={handleCloseTestimony}>
        <Modal.Title>
          {"Add Your Testimony" +
            (bill ? " for " + bill.BillNumber + " - " + bill.Title : "")}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="container">
          <div className="row">
            <div className="col-sm align-middle">
              <select
                className="form-control"
                defaultValue={defaultPosition}
                onChange={e => {
                  const newPosition = e.target.value
                  if (newPosition) {
                    const testimonyObject = {
                      content: testimony.content,
                      senatorId: profile?.senator?.id,
                      representativeId: profile?.representative?.id,
                      senatorDistrict: profile?.senator?.district,
                      representativeDistrict: profile?.representative?.district,
                      position: newPosition
                    }
                    setTestimony(testimonyObject)
                  }
                }}
              >
                <option>{positionMessage}</option>
                <option value="endorse">Endorse</option>
                <option value="oppose">Oppose</option>
                <option value="neutral">Neutral</option>
              </select>
              <div>
                <EmailToMyLegislatorsComponent
                  checkedSendToYourLegislators={checkedSendToYourLegislators}
                  setCheckedSendToYourLegislators={
                    setCheckedSendToYourLegislators
                  }
                  senator={senator}
                  representative={representative}
                />
              </div>
              <div>
                <EmailToCommitteeComponent
                  checkedSendToCommittee={checkedSendToCommittee}
                  setCheckedSendToCommittee={setCheckedSendToCommittee}
                  committeeName={committeeName}
                />
              </div>
              <div>
                <TweetComponent
                  checkedTweet={checkedTweet}
                  setCheckedTweet={setCheckedTweet}
                />
              </div>
            </div>

            <div className="col-sm">
              {testimonyExplanation}
              <textarea
                className="form-control col-sm"
                resize="none"
                rows="20"
                placeholder={defaultContent}
                defaultValue={existingTestimony ? defaultContent : null}
                // need default value if there was existing testimony
                required
                onChange={e => {
                  const newText = e.target.value
                  const testimonyObject = {
                    position: testimony.position,
                    senatorId: profile?.senator?.id,
                    representativeId: profile?.representative?.id,
                    senatorDistrict: profile?.senator?.district,
                    representativeDistrict: profile?.representative?.district,
                    content: newText
                  }
                  setTestimony(testimonyObject)
                }}
              />
              <Button className="mt-2">Upload a document</Button>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" onClick={publishTestimony}>
          {!positionChosen
            ? "Choose Endorse/Oppose/Neutral to Publish"
            : !testimonyWritten
            ? "Write Testimony to Publish"
            : !isPublishing
            ? "Publish"
            : "Publishing.."}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default CommentModal
