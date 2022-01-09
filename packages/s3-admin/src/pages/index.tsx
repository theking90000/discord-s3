import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { FC } from "react";
import SideBar from "../components/SideBar";
import ThemeToggler from "../components/ThemeToggler";

const page: FC<{}> = () => {
  return <SideBar></SideBar>;
};

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "login"])),
    },
  };
}

export default page;
