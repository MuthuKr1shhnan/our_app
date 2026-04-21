const profile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(200).json({
        success: false,
        message: "User not found!!!",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  profile,
};
