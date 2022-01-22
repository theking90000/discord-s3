import {
  Box,
  Button,
  Flex,
  HStack,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Link from "next/link";
import { FC, Provider } from "react";
import { GrStorage } from "react-icons/gr";
import { useQuery } from "react-query";
import BaseForm from "../../components/form/BaseForm";
import SideBar from "../../components/SideBar";
import { CloudProvider } from "../../lib/data";
import { axiosApiClient, useFetchQuery } from "../../lib/data-fetch";

const page: FC = () => {
  const { t } = useTranslation("providers");
  const { isLoading, isError, data } =
    useFetchQuery<CloudProvider[]>("providers");
  return (
    <SideBar>
      <Box mx="10" my="2" height="100%">
        <HStack>
          <Text fontFamily="monospace" fontSize="3xl">
            {t("providers")}
          </Text>
          <div onClick={() => axiosApiClient.get("/providers/test")}>click</div>
          <Link href="/providers/new">
            <Button>{t("add_provider")}</Button>
          </Link>
        </HStack>
        <Flex
          sx={{
            "&::-webkit-scrollbar": {
              width: "4px",
              borderRadius: "2px",
              backgroundColor: `rgba(0, 0, 0, 0.05)`,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: `rgba(0, 0, 0, 0.05)`,
            },
          }}
          overflowY="auto"
          height="80vh"
          width="100%"
          justifyContent="center"
        >
          <VStack width="100%">
            {isLoading && <Spinner />}
            {data &&
              data.map((provider) => (
                <Item key={provider._id} provider={provider} />
              ))}
          </VStack>
        </Flex>
      </Box>
    </SideBar>
  );
};

const Item: FC<{ provider: CloudProvider }> = ({ provider }) => {
  function getType() {
    if (provider.discordWebhook) {
      return "webhook";
    }
    if (provider.discordBotToken && provider.discordChannelId) {
      return "discord-bot";
    }
    if (provider.telegramInfos) {
      return "telegram";
    }

    return "";
  }

  return (
    <Link passHref href={`/providers/${provider._id}`}>
      <Box
        _hover={{ bgColor: "teal.400" }}
        cursor="pointer"
        width="100%"
        borderWidth={1}
        borderRadius="4px"
        p="5"
      >
        <HStack>
          <Box sx={{ stroke: "#ffffff !important" }} mr="2">
            <GrStorage stroke="currentColor" />
          </Box>
          <Text fontSize="md" fontFamily="monospace">
            {getType()}
          </Text>
        </HStack>
      </Box>
    </Link>
  );
};

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "providers"])),
    },
  };
}

export default page;
