
const path = require("path");
const crypto = require("crypto");
const fs = require("fs").promises;
const pdf = require("pdf-creator-node");

downloadClaimSummaryPdf: async (req, res, next) => {
    const Options = {
      formate: "A4",
      orientation: "portrait",
      border: {
        top: "2mm", // default is 0, units: mm, cm, in, px
        right: "1cm",
        bottom: "2mm",
        left: "1cm",
      },
      html: {
        zoom: 0.55,
      },
      header: {
        height: "4mm",
      },
      footer: {
        height: "20mm",
      },
      childProcessOptions: {
        env: {
          OPENSSL_CONF: "/dev/null",
        },
      },
    };

    const { claimReqId } = req.params;

    try {
      if (!claimReqId) {
        return res.status(400).json({
          status: false,
          message: "Please provide claimReqId",
        });
      }

      const claimRequestData = await ClaimReq.findByPk(+claimReqId).then(
        (res) => {
          return res.get({ plain: true });
        }
      );

      const userData = await Traveler.findByPk(+claimRequestData.userId);

      const documentData = await TravelerClaimDoc.findAll({
        where: {
          claimRequestId: {
            [Op.in]: [...claimRequestData.claimRequestIds],
          },
        },
      }).then((res) => res.map((d) => d.get({ plain: true })));

      const paymentData = await TravelerPaymentDetails.findOne({
        where: {
          claimRequestId: +claimReqId,
        },
      }).then((res) => res.get({ plain: true }));
      console.log(paymentData);

      const policyData = await Policy.findOne({
        where: {
          userId: userData.dataValues.id,
        },
      }).then((res) => res.get({ plain: true }));

      const claimSummaryHtmlPath = `${process.cwd()}/claim-summary.html`;
      const readClaimSummary = await fs.readFile(claimSummaryHtmlPath, "utf8");

      const fileName = `${userData.uidNo}.pdf`;

      const claimSummary = {
        insurancePolicyPackage: userData.package,
        uidNo: userData.uidNo,
        travelAgent: userData.gsa,
        lossCountry: claimRequestData.lossCountry,
        departureDate: policyData.startDate,
        returnDate: policyData.endDate,
        date: moment(claimRequestData.submittedDate).format("DD-MM-YYYY"),
        declaration:
          "I/We declare that the information given in this claim form is true and correct to the best of my knowledge and belief.I/We undertake to render every assistance on my/our power in dealing with the matter.I hereby authorize any hospital physician, other person who has attended or examined me, to furnish to the Company, or its authorized representative, any and all information with respect to any illness or injury, medical history, consultation, prescriptions or treatment and copies of all hospital or medical records. A digital copy of this authorization shall be considered as effective and valid as the original",
        paymentOption: paymentData,
      };

      const doc = {
        html: readClaimSummary,
        data: {
          ...claimSummary,
        },
        path: path.join(
          __dirname,
          "..",
          "static",
          "uploads",
          "claim-summary",
          fileName
        ),
      };

      const convertedFilePath = pdf
        .create(doc, Options)
        .then((data) => {
          console.log("Pdf created successfully");
          return data.filename;
        })
        .catch((err) => {
          console.log("PDF error", err);
        });

      const mergePath = path.join(
        __dirname,
        "..",
        "static",
        "uploads",
        "claim-summary",
        `${userData.uidNo}-${crypto.randomUUID()}`
      );

      const finalClaimSummaryPath = await convertAndMergePDFs(
        convertedFilePath,
        documentData,
        mergePath
      );

      return res.download(finalClaimSummaryPath);
    } catch (err) {
      console.log(err);
      next(err);
    }
  },
